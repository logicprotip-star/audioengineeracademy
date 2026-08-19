// Kesim Noktası moduna özel testler: seans içi soru sırasına bağlı tip-gizleme
// rampası (G18 — zorluktan BAĞIMSIZ), şık sayısı zorlukla değişimi, çeldirici
// üretimi (frekans mesafesi + tip karışımı, tekrarlayan etiket yok), kesim
// frekansı havuzunun (CUTOFF_MIN–CUTOFF_MAX) uç değerlerden korunması,
// evaluateAnswer'ın hem frekans HEM tip eşleşmesi arayan mantığı.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mode from "../www/js/modes/kesim-noktasi.js";
import { representativeLevelForTier } from "../www/js/core/difficulty-curve.js";

describe("Kesim Noktası — tip gizleme SEANS İÇİ SORU SIRASINA bağlı (G18)", () => {
  it("sessionQuestionIndex 0,1,2 (ilk 3 soru) → typeRevealed HER ZAMAN true, HANGİ zorlukta olursa olsun", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let idx = 0; idx < mode.TYPE_REVEAL_QUESTION_COUNT; idx++) {
        for (let i = 0; i < 15; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: idx });
          assert.equal(q.typeRevealed, true, `${level}/idx=${idx}: typeRevealed false olmamalıydı`);
        }
      }
    }
  });

  it(`sessionQuestionIndex >= ${mode.TYPE_REVEAL_QUESTION_COUNT} (4. sorudan itibaren) → typeRevealed HER ZAMAN false, HANGİ zorlukta olursa olsun`, () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (const idx of [mode.TYPE_REVEAL_QUESTION_COUNT, mode.TYPE_REVEAL_QUESTION_COUNT + 1, 10, 50]) {
        for (let i = 0; i < 15; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: idx });
          assert.equal(q.typeRevealed, false, `${level}/idx=${idx}: typeRevealed true olmamalıydı`);
        }
      }
    }
  });

  it("sessionQuestionIndex verilmezse varsayılan 0 (typeRevealed=true) — geriye dönük güvenli", () => {
    const q = mode.createQuestion("pro", { source: "pink", boss: false });
    assert.equal(q.typeRevealed, true);
  });

  it("EŞİK TEK BİR SABİTTE (TYPE_REVEAL_QUESTION_COUNT), kolay değiştirilebilir", () => {
    assert.equal(typeof mode.TYPE_REVEAL_QUESTION_COUNT, "number");
    assert.ok(mode.TYPE_REVEAL_QUESTION_COUNT > 0);
  });

  it("typeRevealed=true iken TÜM şıklar doğru şıkla AYNI filtre tipini taşır (tip zaten söylendi, çeldirici sadece frekans)", () => {
    for (let i = 0; i < 30; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false, sessionQuestionIndex: 0 });
      q.choices.forEach(c => assert.equal(c.filterType, q.filterType));
    }
  });

  it("typeRevealed=false iken en az bir (doğru olmayan) şıkkın filtre tipi ÇEVRİLMİŞ — tip gerçekten test ediliyor", () => {
    for (const level of ["easy", "medium", "hard", "pro"]) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: 10 });
        const flipped = q.choices.some(c => !c.correct && c.filterType !== q.filterType);
        assert.ok(flipped, `${level}: hiçbir şık tip çevrilmemiş (deneme ${i})`);
      }
    }
  });

  it("doğru şık ASLA tip-çevrilmez (her zaman question.filterType ile aynı), typeRevealed durumundan bağımsız", () => {
    for (const sessionQuestionIndex of [0, 10]) {
      for (let i = 0; i < 20; i++) {
        const q = mode.createQuestion("pro", { source: "pink", boss: false, sessionQuestionIndex });
        const correctChoice = q.choices.find(c => c.correct);
        assert.ok(correctChoice, "doğru şık bulunamadı");
        assert.equal(correctChoice.filterType, q.filterType);
        assert.ok(Math.abs(correctChoice.freq - q.freq) < 1e-9);
      }
    }
  });
});

describe("Kesim Noktası — HPF/LPF dengesi", () => {
  it("her iki filtre tipi de ~%50/%50 civarında dengeli üretiliyor (2000 örnek, ±10 puan tolerans)", () => {
    const counts = { highpass: 0, lowpass: 0 };
    for (let i = 0; i < 2000; i++) {
      const q = mode.createQuestion("medium", { source: "pink", boss: false });
      counts[q.filterType]++;
    }
    const hpPct = (counts.highpass / 2000) * 100;
    assert.ok(hpPct > 40 && hpPct < 60, `HPF oranı %${hpPct.toFixed(1)} — dengesiz görünüyor`);
  });
});

describe("Kesim Noktası — şık sayısı zorlukla değişir", () => {
  it("her zorlukta üretilen şık sayısı DIFFICULTY.options'a TAM eşit (dar havuzda bile daralma yok)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false, sessionQuestionIndex: i % 8 });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options, `${level}: ${q.choices.length} şık`);
      }
    }
  });

  it("kolay(3) < orta(4) < zor(5) < pro(6) — DIFFICULTY tablosu bu sırayı garanti eder", () => {
    assert.ok(mode.DIFFICULTY.easy.options < mode.DIFFICULTY.medium.options);
    assert.ok(mode.DIFFICULTY.medium.options < mode.DIFFICULTY.hard.options);
    assert.ok(mode.DIFFICULTY.hard.options < mode.DIFFICULTY.pro.options);
  });

  it("DISTRACTOR_STEP_OCT kolayda EN GENİŞ, zorlaştıkça daralır (şık mesafesi kolayda uzak, zorda yakın)", () => {
    assert.ok(mode.DISTRACTOR_STEP_OCT.easy > mode.DISTRACTOR_STEP_OCT.medium);
    assert.ok(mode.DISTRACTOR_STEP_OCT.medium > mode.DISTRACTOR_STEP_OCT.hard);
    assert.ok(mode.DISTRACTOR_STEP_OCT.hard > mode.DISTRACTOR_STEP_OCT.pro);
  });

  it("marginOct kolayda EN BÜYÜK (merkezden en uzak/bariz), zorlaştıkça küçülür (merkeze yaklaşır/ince)", () => {
    assert.ok(mode.DIFFICULTY.easy.marginOct > mode.DIFFICULTY.medium.marginOct);
    assert.ok(mode.DIFFICULTY.medium.marginOct > mode.DIFFICULTY.hard.marginOct);
    assert.ok(mode.DIFFICULTY.hard.marginOct > mode.DIFFICULTY.pro.marginOct);
  });
});

describe("Kesim Noktası — çeldirici üretimi ve kesim frekansı havuzu (CUTOFF_MIN–CUTOFF_MAX)", () => {
  it("her şık ve doğru cevap CUTOFF_MIN–CUTOFF_MAX havuzunda kalır (FA_MIN–FA_MAX'ın TAMAMI değil — bkz. dosya başı 'uç değer' notu)", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 25; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.ok(q.freq >= mode.CUTOFF_MIN - 1e-6 && q.freq <= mode.CUTOFF_MAX + 1e-6, `${level}: ${q.freq} havuz dışı`);
        q.choices.forEach(c => {
          assert.ok(c.freq >= mode.CUTOFF_MIN - 1e-6 && c.freq <= mode.CUTOFF_MAX + 1e-6, `${level}: ${c.freq} havuz dışı`);
        });
      }
    }
  });

  it("CUTOFF_MIN/CUTOFF_MAX, FA_MIN/FA_MAX'ın KESİN İÇİNDE kalır (eksen sınırını asla aşmaz)", () => {
    assert.ok(mode.CUTOFF_MIN > mode.FA_MIN);
    assert.ok(mode.CUTOFF_MAX < mode.FA_MAX);
  });

  it("şıklar arasında tekrarlanan frekans yok (her şık ayırt edilebilir)", () => {
    for (let i = 0; i < 30; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false });
      const freqs = q.choices.map(c => c.freq);
      assert.equal(new Set(freqs).size, freqs.length);
    }
  });

  it("şıklar arasında GÖRÜNTÜLENEN etiket (formatHz yuvarlaması) de tekrarlamıyor — kullanıcı iki özdeş görünen şıkla karşılaşmıyor", () => {
    const formatLike = f => f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 1 : 2)}kHz` : `${Math.round(f)}Hz`;
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 40; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        const labels = q.choices.map(c => formatLike(c.freq));
        assert.equal(new Set(labels).size, labels.length, `${level}: görünen etiketlerde tekrar var (${labels.join(",")})`);
      }
    }
  });
});

describe("Kesim Noktası — evaluateAnswer (frekans + tip)", () => {
  it("tam isabet (doğru frekans + doğru tip) → correct:true, freqOk:true, typeOk:true", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const result = mode.evaluateAnswer(q, { freq: q.freq, filterType: q.filterType });
    assert.equal(result.correct, true);
    assert.equal(result.freqOk, true);
    assert.equal(result.typeOk, true);
  });

  it("doğru frekans ama YANLIŞ tip → correct:false (typeOk:false), freqOk hâlâ true", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const wrongType = q.filterType === "highpass" ? "lowpass" : "highpass";
    const result = mode.evaluateAnswer(q, { freq: q.freq, filterType: wrongType });
    assert.equal(result.correct, false);
    assert.equal(result.freqOk, true);
    assert.equal(result.typeOk, false);
  });

  it("doğru tip ama UZAK frekans (2 oktav) → correct:false (freqOk:false), typeOk hâlâ true", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const result = mode.evaluateAnswer(q, { freq: q.freq * 4, filterType: q.filterType });
    assert.equal(result.correct, false);
    assert.equal(result.freqOk, false);
    assert.equal(result.typeOk, true);
  });

  it("FREQ_TOLERANCE_OCT sınırı: içeride doğru, dışarıda yanlış (tip sabit doğru tutularak)", () => {
    const q = { mode: "cutoff", freq: 1000, filterType: "highpass" };
    const justInside = mode.evaluateAnswer(q, { freq: 1000 * Math.pow(2, mode.FREQ_TOLERANCE_OCT - 0.01), filterType: "highpass" });
    const justOutside = mode.evaluateAnswer(q, { freq: 1000 * Math.pow(2, mode.FREQ_TOLERANCE_OCT + 0.01), filterType: "highpass" });
    assert.equal(justInside.correct, true);
    assert.equal(justOutside.correct, false);
  });

  it("DISTRACTOR_STEP_OCT her zorlukta FREQ_TOLERANCE_OCT'tan büyük (yanlış şık asla 'doğru' sayılmaz)", () => {
    for (const level of Object.keys(mode.DISTRACTOR_STEP_OCT)) {
      assert.ok(mode.DISTRACTOR_STEP_OCT[level] > mode.FREQ_TOLERANCE_OCT,
        `${level}: step ${mode.DISTRACTOR_STEP_OCT[level]} <= tolerans ${mode.FREQ_TOLERANCE_OCT}`);
    }
  });

  it("edge case — ilk ve son şıkkı (dizi sırasına göre) seçmek, doğru/yanlışlığı DOĞRU DEĞERLENDİRİR (evaluateAnswer şık DİZİ KONUMUNU hiç bilmiyor)", () => {
    const q = mode.createQuestion("pro", { source: "pink", boss: false, sessionQuestionIndex: 10 });
    const first = q.choices[0];
    const last = q.choices[q.choices.length - 1];
    [first, last].forEach(choice => {
      const result = mode.evaluateAnswer(q, { freq: choice.freq, filterType: choice.filterType });
      assert.equal(result.correct, choice.correct, `şık (freq=${choice.freq}, type=${choice.filterType}, correct=${choice.correct}) yanlış değerlendirildi`);
    });
  });

  it("edge case — tip gizli soruda, YANLIŞ TİPTEKİ bir şık seçilirse asla 'doğru' sayılmaz (frekans tam tutsa bile)", () => {
    for (let i = 0; i < 20; i++) {
      const q = mode.createQuestion("pro", { source: "pink", boss: false, sessionQuestionIndex: 10 });
      const flippedChoice = q.choices.find(c => !c.correct && c.filterType !== q.filterType);
      if (!flippedChoice) continue; // bu deneme hiç çevrilmiş şık üretmemiş olabilir, sorun değil
      const result = mode.evaluateAnswer(q, { freq: flippedChoice.freq, filterType: flippedChoice.filterType });
      assert.equal(result.correct, false);
    }
  });
});

describe("Kesim Noktası — createQuestion genel sözleşme", () => {
  it("her zorlukta geçerli, saf (JSON serileşebilir) bir soru üretir", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      const q = mode.createQuestion(level, { source: "pink", boss: false });
      assert.equal(q.mode, "cutoff");
      assert.equal(q.difficulty, level);
      assert.equal(q.hintUsed, false);
      assert.ok(q.filterType === "highpass" || q.filterType === "lowpass");
      assert.ok(q.filterLabel === "HPF" || q.filterLabel === "LPF");
      assert.ok(q.freq >= mode.CUTOFF_MIN && q.freq <= mode.CUTOFF_MAX);
      const json = JSON.stringify(q);
      assert.ok(json.length > 0);
    }
  });

  it("boss round'da kesim frekansı merkeze normal round'dan (istatistiksel olarak) daha yakın (daha zor/ince)", () => {
    // N=80'de nadiren (örneklem şansı) yanlış-negatif flake gözlendi — etki
    // gerçek ama küçük (marginOct 1.0→0.6), N büyütülerek örneklem hatası payı
    // ihmal edilebilir seviyeye indirildi (bkz. commit mesajı).
    const centerLog = Math.log2(Math.sqrt(mode.CUTOFF_MIN * mode.CUTOFF_MAX));
    let normalDistSum = 0, bossDistSum = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const normal = mode.createQuestion("medium", { source: "pink", boss: false });
      const boss = mode.createQuestion("medium", { source: "pink", boss: true });
      normalDistSum += Math.abs(Math.log2(normal.freq) - centerLog);
      bossDistSum += Math.abs(Math.log2(boss.freq) - centerLog);
    }
    assert.ok(bossDistSum / N < normalDistSum / N, "boss round ortalama olarak merkeze normal'den daha yakın olmalıydı");
  });

  it("calculateXP: doğru cevapta pozitif, yanlışta 0", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctResult = mode.evaluateAnswer(q, { freq: q.freq, filterType: q.filterType });
    const gained = mode.calculateXP(q, correctResult, false, "medium", { combo: 1, timeLeft: 5, roundDuration: 10, xpMultiplier: 1 });
    assert.ok(gained > 0);

    const wrongResult = mode.evaluateAnswer(q, { freq: q.freq * 8, filterType: q.filterType });
    const zero = mode.calculateXP(q, wrongResult, false, "medium", { combo: 1, timeLeft: 5, roundDuration: 10, xpMultiplier: 1 });
    assert.equal(zero, 0);
  });

  it("getMeta(): kart metni yok, choiceOnly:true (Dokunmalı'yı desteklemiyor), difficulty tüm 5 zorluk anahtarını (paylaşılan seçici) kapsar", () => {
    const meta = mode.getMeta();
    assert.equal(meta.ad, undefined);
    assert.equal(meta.aciklama, undefined);
    assert.equal(meta.id, "kesim-noktasi");
    assert.equal(meta.choiceOnly, true);
    for (const level of ["easy", "medium", "hard", "pro", "proplus"]) {
      assert.ok(meta.difficulty[level], `${level} DIFFICULTY'de yok`);
      assert.ok(typeof meta.difficulty[level].lives === "number");
    }
    assert.ok(Array.isArray(meta.uyumluKaynaklar) && meta.uyumluKaynaklar.length > 5, "kaynak kısıtlaması olmamalıydı");
  });
});

describe("Kesim Noktası — applyProcessing (A/B: kuru/işlenmiş yol audio-engine.js'e devrediliyor)", () => {
  it("questionType'a göre doğru BiquadFilterNode type'ı kurar, TEK filtre döner (sahte audioCtx ile)", () => {
    for (const filterType of ["highpass", "lowpass"]) {
      const created = [];
      const fakeAudioCtx = {
        createBiquadFilter: () => {
          const f = { type: null, frequency: { value: 0 }, Q: { value: 0 } };
          created.push(f);
          return f;
        }
      };
      const q = { freq: 1234, filterType };
      const { filters } = mode.applyProcessing(q, { audioCtx: fakeAudioCtx });
      assert.equal(filters.length, 1);
      assert.equal(filters[0].type, filterType);
      assert.equal(filters[0].frequency.value, 1234);
      // G334 — Q ARTIK negatif (dB rezonans değeri, Web Audio'nun lowpass/
      // highpass Q semantiği — bkz. FILTER_Q'nun kendi notu). "Q>0" varsayımı
      // ESKİ (yanlış) Butterworth-Q modeline aitti, DÜZELTİLDİ.
      assert.ok(Number.isFinite(filters[0].Q.value));
      assert.equal(created.length, 1);
    }
  });
});

describe("Kesim Noktası — öğretici metin (G20, teachingText/getFeedbackData)", () => {
  it("DOĞRU cevap: metin frekans+tip etiketini VE bir 'etki' cümlesi içerir, teknik değer (dB/oct, Q) YOK", () => {
    const q = { freq: 300, filterType: "highpass", filterLabel: "HPF" };
    const text = mode.teachingText(q, { freq: 300, filterType: "highpass" });
    assert.match(text, /300 Hz HPF/);
    assert.ok(text.length > 15, "sadece etiket değil, bir 'etki' açıklaması da olmalı");
    assert.doesNotMatch(text, /dB|Q=|oktav|slope/i);
  });

  it("DOĞRU cevap: bölgeye göre FARKLI etki metni üretir (aynı tip, farklı frekans → farklı cümle)", () => {
    const low = mode.teachingText({ freq: 100, filterType: "highpass", filterLabel: "HPF" }, { freq: 100, filterType: "highpass" });
    const high = mode.teachingText({ freq: 5000, filterType: "highpass", filterLabel: "HPF" }, { freq: 5000, filterType: "highpass" });
    assert.notEqual(low, high);
  });

  it("TİP DOĞRU, FREKANS YANLIŞ: kullanıcının hangi YÖNE kaçtığını belirtir (yukarı/aşağı) ve bu yöndeki etkiyi anlatır", () => {
    const q = { freq: 167, filterType: "highpass", filterLabel: "HPF" };
    const higher = mode.teachingText(q, { freq: 882, filterType: "highpass" }); // kullanıcı daha YUKARI dedi
    assert.match(higher, /yukarı/);
    assert.match(higher, /167 Hz/);
    assert.match(higher, /882 Hz/);
    assert.match(higher, /inceleşir|gövde/); // HPF'de yukarı kaçmak = daha fazla gövde gider

    const lower = mode.teachingText(q, { freq: 90, filterType: "highpass" }); // kullanıcı daha AŞAĞI dedi
    assert.match(lower, /aşağı/);
    assert.notEqual(higher, lower);
  });

  it("TİP DOĞRU, FREKANS YANLIŞ: LPF'de yön↔etki HPF'nin TERSİ (yukarı=az agresif/fazla tiz kalır, aşağı=fazla boğuklaşır)", () => {
    const q = { freq: 2000, filterType: "lowpass", filterLabel: "LPF" };
    const higher = mode.teachingText(q, { freq: 6000, filterType: "lowpass" });
    const lower = mode.teachingText(q, { freq: 600, filterType: "lowpass" });
    assert.match(higher, /tiz|sertlik/);
    assert.match(lower, /boğukla|netlik/);
  });

  it("TİP YANLIŞ: HPF/LPF farkını karşılaştırmalı hatırlatır, doğru VE kullanıcının seçtiği tip ikisi de metinde geçer", () => {
    const q = { freq: 500, filterType: "highpass", filterLabel: "HPF" };
    const text = mode.teachingText(q, { freq: 500, filterType: "lowpass" });
    assert.match(text, /HPF/);
    assert.match(text, /LPF/);
  });

  it("TİP YANLIŞ: hangi tip doğruysa metin ona göre değişir (HPF doğruyken vs LPF doğruyken FARKLI metin)", () => {
    const hpfCorrect = mode.teachingText({ freq: 500, filterType: "highpass", filterLabel: "HPF" }, { freq: 500, filterType: "lowpass" });
    const lpfCorrect = mode.teachingText({ freq: 500, filterType: "lowpass", filterLabel: "LPF" }, { freq: 500, filterType: "highpass" });
    assert.notEqual(hpfCorrect, lpfCorrect);
  });

  it("üç durumun HEPSİ kısa kalır (1-2 cümle hedefi — 280 karakterin altında, uzun paragraf yok)", () => {
    const cases = [
      mode.teachingText({ freq: 1000, filterType: "highpass", filterLabel: "HPF" }, { freq: 1000, filterType: "highpass" }),
      mode.teachingText({ freq: 1000, filterType: "highpass", filterLabel: "HPF" }, { freq: 2000, filterType: "highpass" }),
      mode.teachingText({ freq: 1000, filterType: "highpass", filterLabel: "HPF" }, { freq: 1000, filterType: "lowpass" })
    ];
    cases.forEach(text => assert.ok(text.length < 280, `çok uzun: ${text.length} karakter`));
  });

  it("getFeedbackData: title+detail'e bölünmüş döner, showResult HER ZAMAN true (bu modun TEK geri bildirim yüzeyi #feedbackBox)", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false });
    const correctFeedback = mode.getFeedbackData(q, { freq: q.freq, filterType: q.filterType }, { gained: 20 });
    assert.equal(correctFeedback.title, "Doğru!");
    assert.match(correctFeedback.detail, /\+20 XP/);
    assert.equal(correctFeedback.showResult, true);
    assert.equal(correctFeedback.panel, null);

    const wrongType = { freq: q.freq, filterType: q.filterType === "highpass" ? "lowpass" : "highpass" };
    const wrongFeedback = mode.getFeedbackData(q, wrongType, { gained: 0 });
    assert.equal(wrongFeedback.title, "Yanlış filtre tipi");
    assert.equal(wrongFeedback.showResult, true);

    const wrongFreq = { freq: q.freq * 4, filterType: q.filterType };
    const closeFeedback = mode.getFeedbackData(q, wrongFreq, { gained: 0 });
    assert.equal(closeFeedback.title, "Yakın ama kaçtı");
    assert.equal(closeFeedback.showResult, true);
  });

  it("teachingText SAF FONKSİYON: DOM/ses'e dokunmaz, aynı girdi için aynı çıktıyı üretir", () => {
    const q = { freq: 800, filterType: "lowpass", filterLabel: "LPF" };
    const answer = { freq: 200, filterType: "lowpass" };
    const a = mode.teachingText(q, answer);
    const b = mode.teachingText(q, answer);
    assert.equal(a, b);
  });
});

// G21 SERT TEST TARAMASI: 6 bölge × 2 filtre tipi × 3 durum = 36 kombinasyonun
// TAMAMI — hiçbiri boş/kısa/bozuk (undefined, NaN, [object) metin üretmemeli.
// Bölge temsilcisi frekanslar FA_ZONES'un (frekans-bulma.js) her bölgesinden
// birer örnek — CUTOFF_MIN–CUTOFF_MAX havuzunun dışında kalan bölgeler
// (SUB'ın alt ucu, TİZ) bile burada taranıyor çünkü teachingText'in
// KENDİSİ (createQuestion'ın aksine) frekansı hiçbir havuza kırpmıyor —
// havuz sınırları ileride değişirse bu tarama hâlâ geçerli kalsın diye.
describe("Kesim Noktası — G21 sert test: öğretici metin 6 bölge × 2 tip × 3 durum TAMAMI", () => {
  const ZONE_SAMPLES = { "SUB": 60, "BAS": 180, "ALT-ORTA": 350, "ORTA": 1000, "ÜST-ORTA": 4000, "TİZ": 12000 };

  for (const [zoneKey, freq] of Object.entries(ZONE_SAMPLES)) {
    for (const filterType of ["highpass", "lowpass"]) {
      const filterLabel = filterType === "highpass" ? "HPF" : "LPF";
      const q = { freq, filterType, filterLabel };
      const otherType = filterType === "highpass" ? "lowpass" : "highpass";

      it(`${zoneKey}/${filterLabel}: üç durumun HİÇBİRİ boş/bozuk metin üretmez`, () => {
        const cases = [
          mode.teachingText(q, { freq, filterType }),                    // doğru
          mode.teachingText(q, { freq: freq * 2, filterType }),          // tip doğru, yukarı
          mode.teachingText(q, { freq: freq / 2, filterType }),          // tip doğru, aşağı
          mode.teachingText(q, { freq, filterType: otherType })          // tip yanlış
        ];
        cases.forEach((text, i) => {
          assert.ok(text && text.length >= 10, `durum ${i}: boş/çok kısa metin: ${JSON.stringify(text)}`);
          assert.doesNotMatch(text, /undefined|NaN|\[object/i, `durum ${i}: bozuk metin: ${text}`);
          assert.doesNotMatch(text, /dB|Q=|\boktav\b|slope/i, `durum ${i}: teknik değer sızmış: ${text}`);
        });
      });
    }
  }
});

// G21 SERT TEST TARAMASI: büyük örneklemli sağlamlık — kalıcı test paketinde
// (öncekiler zaten büyük N kullanıyor) EK olarak ramp'in TÜM (zorluk × seans
// indeksi) hücrelerini TEK testte topluca tarar — 5 zorluk × 8 indeks × 15
// deneme = 600 soru, hem options hem typeRevealed hem havuz sınırı birden.
describe("Kesim Noktası — G21 sert test: zorluk rampası × seans indeksi TAM matris", () => {
  it("600 soru (5 zorluk × 8 seans-indeksi × 15 tekrar): options, typeRevealed, havuz sınırı HİÇ sapmıyor", () => {
    let checked = 0;
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let idx = 0; idx <= 7; idx++) {
        for (let i = 0; i < 15; i++) {
          const q = mode.createQuestion(level, { source: "pink", boss: i % 4 === 0, sessionQuestionIndex: idx });
          checked++;
          assert.equal(q.choices.length, mode.DIFFICULTY[level].options, `${level}/idx${idx}: yanlış şık sayısı`);
          assert.equal(q.typeRevealed, idx < mode.TYPE_REVEAL_QUESTION_COUNT, `${level}/idx${idx}: yanlış typeRevealed`);
          assert.ok(q.freq >= mode.CUTOFF_MIN - 1e-6 && q.freq <= mode.CUTOFF_MAX + 1e-6, `${level}/idx${idx}: havuz dışı freq`);
          const correctChoice = q.choices.find(c => c.correct);
          assert.ok(correctChoice && Math.abs(correctChoice.freq - q.freq) < 1e-6 && correctChoice.filterType === q.filterType,
            `${level}/idx${idx}: doğru şık eksik/yanlış`);
        }
      }
    }
    assert.equal(checked, 5 * 8 * 15);
  });
});

// ADIM 1 — zorluk sisteminin merkezi bağlanması, Kesim Noktası PİLOT modu.
// paramsForDifficultyPosition() SAF fonksiyon testleri + createQuestion'ın
// settings.difficultyPosition VARSA eğriyi, YOKSA (mevcut testlerin hepsi gibi)
// eski statik DIFFICULTY[level] yolunu kullandığının doğrulanması.
describe("Kesim Noktası — paramsForDifficultyPosition() (ADIM 1 zorluk eğrisi)", () => {
  it("position arttıkça marginOct PÜRÜZSÜZ (monoton) KÜÇÜLÜR — ara adımlarda ATLAMA yok", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.25) {
      const { marginOct } = mode.paramsForDifficultyPosition(p);
      assert.ok(marginOct <= prev + 1e-9, `position ${p}'de marginOct azalmadı`);
      prev = marginOct;
    }
  });

  it("position arttıkça hintBandOct de PÜRÜZSÜZ küçülür", () => {
    let prev = Infinity;
    for (let p = 1; p <= 20; p += 0.5) {
      const { hintBandOct } = mode.paramsForDifficultyPosition(p);
      assert.ok(hintBandOct <= prev + 1e-9, `position ${p}'de hintBandOct azalmadı`);
      prev = hintBandOct;
    }
  });

  it("position arttıkça options MONOTON ARTAR ve her zaman 3-6 arası tam sayı", () => {
    let prev = 0;
    for (let p = 1; p <= 20; p += 0.5) {
      const { options } = mode.paramsForDifficultyPosition(p);
      assert.ok(Number.isInteger(options) && options >= 3 && options <= 6, `position ${p}: geçersiz options ${options}`);
      assert.ok(options >= prev, `position ${p}'de options azaldı`);
      prev = options;
    }
  });

  it("distractorStepOct HER ZAMAN FREQ_TOLERANCE_OCT'tan büyük — tavanın ÇOK üzerinde bile", () => {
    for (const p of [1, 5, 10, 20, 50, 500]) {
      const { distractorStepOct } = mode.paramsForDifficultyPosition(p);
      assert.ok(distractorStepOct > mode.FREQ_TOLERANCE_OCT, `position ${p}: step ${distractorStepOct} <= tolerans`);
    }
  });

  it("tavanın (LEVEL_CAP) ÇOK ötesinde marginOct/hintBandOct/distractorStepOct bir TABANIN altına inmez", () => {
    const cfg = mode.KESIM_CURVE_CONFIG;
    const far = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP + 1000);
    assert.ok(far.marginOct >= cfg.MARGIN_OCT_FLOOR - 1e-9);
    assert.ok(far.hintBandOct >= cfg.HINT_BAND_OCT_FLOOR - 1e-9);
    assert.ok(far.distractorStepOct >= cfg.STEP_OCT_FLOOR - 1e-9);
    assert.ok(far.timeSec >= cfg.TIME_SEC_FLOOR - 1e-9);
  });

  it("position=1'de config'in AT_1 değerlerini birebir döner (tavan aşılmadı)", () => {
    const cfg = mode.KESIM_CURVE_CONFIG;
    const p = mode.paramsForDifficultyPosition(1);
    assert.ok(Math.abs(p.marginOct - cfg.MARGIN_OCT_AT_1) < 1e-9);
    assert.ok(Math.abs(p.hintBandOct - cfg.HINT_BAND_OCT_AT_1) < 1e-9);
    assert.ok(Math.abs(p.timeSec - cfg.TIME_SEC_AT_1) < 1e-9);
  });

  it("position=LEVEL_CAP'te config'in AT_CAP değerlerini birebir döner", () => {
    const cfg = mode.KESIM_CURVE_CONFIG;
    const p = mode.paramsForDifficultyPosition(cfg.LEVEL_CAP);
    assert.ok(Math.abs(p.marginOct - cfg.MARGIN_OCT_AT_CAP) < 1e-9);
    assert.ok(Math.abs(p.hintBandOct - cfg.HINT_BAND_OCT_AT_CAP) < 1e-9);
  });

  it("position<1 veya ondalık için düşmez, position 1 gibi davranır", () => {
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(0));
    assert.doesNotThrow(() => mode.paramsForDifficultyPosition(-5));
    assert.equal(mode.paramsForDifficultyPosition(0).position, 1);
  });
});

describe("Kesim Noktası — createQuestion(settings.difficultyPosition) entegrasyonu", () => {
  it("difficultyPosition VERİLİRSE üretilen şık sayısı paramsForDifficultyPosition().options'a eşit (statik tablo DEĞİL)", () => {
    for (const p of [1, 5, 10, 15, 20]) {
      const expectedOptions = mode.paramsForDifficultyPosition(p).options;
      const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: p });
      assert.equal(q.choices.length, expectedOptions, `position ${p}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
    }
  });

  it("difficultyPosition VERİLMEZSE (geriye dönük uyumluluk) davranış eski statik tabloyla BİREBİR aynı kalır", () => {
    for (const level of Object.keys(mode.DIFFICULTY)) {
      for (let i = 0; i < 20; i++) {
        const q = mode.createQuestion(level, { source: "pink", boss: false });
        assert.equal(q.choices.length, mode.DIFFICULTY[level].options);
        assert.equal(q.hintBandOct, mode.DIFFICULTY[level].hintBandOct);
        assert.equal(q.timeSec, mode.DIFFICULTY[level].time);
      }
    }
  });

  it("difficultyPosition YÜKSEK (zor) verildiğinde üretilen kesim frekansı merkeze YAKIN olma eğiliminde (istatistiksel)", () => {
    const centerFreq = Math.sqrt(mode.CUTOFF_MIN * mode.CUTOFF_MAX);
    const centerLog = Math.log2(centerFreq);
    const N = 400;
    let easyDistSum = 0, hardDistSum = 0;
    for (let i = 0; i < N; i++) {
      const easy = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: 1 });
      const hard = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: 20 });
      easyDistSum += Math.abs(Math.log2(easy.freq) - centerLog);
      hardDistSum += Math.abs(Math.log2(hard.freq) - centerLog);
    }
    assert.ok(hardDistSum / N < easyDistSum / N, "yüksek position ortalama olarak merkeze DAHA UZAK olmamalıydı");
  });

  it("hintBandOct/timeSec soru nesnesinde taşınır ve renderHintMask/DIFFICULTY[level] yerine BUNU kullanır", () => {
    const q = mode.createQuestion("medium", { source: "pink", boss: false, difficultyPosition: 10 });
    const expected = mode.paramsForDifficultyPosition(10);
    assert.ok(Math.abs(q.hintBandOct - expected.hintBandOct) < 1e-9);
    assert.ok(Math.abs(q.timeSec - expected.timeSec) < 1e-9);
  });

  it("proplus'ta difficultyPosition verilse BİLE eğri devreye girmez — her zaman kendi statik satırı kullanılır (Z5 kararıyla aynı çizgi)", () => {
    // NOT: app.js'in currentDifficultyPosition() proplus için difficultyPosition'ı
    // HİÇ ÜRETMEZ (undefined geçer) — burada createQuestion'ın KENDİSİNİN de
    // 'level' proplus olduğunda paramsForDifficultyPosition sonucuna DEĞİL kendi
    // DIFFICULTY.proplus satırına sadık kaldığını doğrudan doğruluyoruz (savunma katmanı).
    for (let i = 0; i < 10; i++) {
      const q = mode.createQuestion("proplus", { source: "pink", boss: false, difficultyPosition: 20 });
      assert.equal(q.choices.length, mode.DIFFICULTY.proplus.options);
    }
  });
});

// ADIM 3 — "Sabit" modu eğriye bağlama (app.js:currentDifficultyPosition'ın
// Sabit dalıyla AYNI kompozisyon: representativeLevelForTier(tier) →
// paramsForDifficultyPosition()). Bu blok, SABİT MODUN GERÇEKTEN eskisinden
// kolay OLMADIĞINI garanti eden invaryant testleri — her tier'ın temsilci
// seviyesinde üretilen eğri değeri, o tier'ın ESKİ statik değerinden EŞİT ya
// da DAHA ZOR olmalı (asla kolay).
describe("Kesim Noktası — Sabit mod eğriye bağlı (ADIM 3, 'kolaylaşma yok' invaryantı)", () => {
  const TIERS = ["easy", "medium", "hard", "pro"];

  it("her tier'da: marginOct/hintBandOct/distractorStepOct eski statikten BÜYÜK DEĞİL (kolaylaşma yok — küçük=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      const oldStep = mode.DISTRACTOR_STEP_OCT[tier];
      assert.ok(p.marginOct <= old.marginOct + 1e-9, `${tier}: marginOct ${p.marginOct} > eski ${old.marginOct}`);
      assert.ok(p.hintBandOct <= old.hintBandOct + 1e-9, `${tier}: hintBandOct ${p.hintBandOct} > eski ${old.hintBandOct}`);
      assert.ok(p.distractorStepOct <= oldStep + 1e-9, `${tier}: step ${p.distractorStepOct} > eski ${oldStep}`);
    }
  });

  it("her tier'da: options eski statikten KÜÇÜK DEĞİL (kolaylaşma yok — çok=zor)", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const p = mode.paramsForDifficultyPosition(level);
      const old = mode.DIFFICULTY[tier];
      assert.ok(p.options >= old.options, `${tier}: options ${p.options} < eski ${old.options}`);
    }
  });

  it("pro'nun temsilci seviyesi TAM LEVEL_CAP — eğrinin en zor noktası, 'yakını' değil", () => {
    assert.equal(representativeLevelForTier("pro"), mode.KESIM_CURVE_CONFIG.LEVEL_CAP);
    const atLevelCap = mode.paramsForDifficultyPosition(mode.KESIM_CURVE_CONFIG.LEVEL_CAP);
    const proRepr = mode.paramsForDifficultyPosition(representativeLevelForTier("pro"));
    assert.deepEqual(atLevelCap, proRepr);
  });

  it("Sabit modun kompozisyonu (representativeLevelForTier → paramsForDifficultyPosition → createQuestion) uçtan uca doğru şık sayısını üretir", () => {
    for (const tier of TIERS) {
      const level = representativeLevelForTier(tier);
      const expectedOptions = mode.paramsForDifficultyPosition(level).options;
      for (let i = 0; i < 10; i++) {
        const q = mode.createQuestion(tier, { source: "pink", boss: false, difficultyPosition: level });
        assert.equal(q.choices.length, expectedOptions, `${tier}: beklenen ${expectedOptions}, gelen ${q.choices.length}`);
      }
    }
  });

  it("STEP_OCT_FLOOR (yeni, daraltılmış) hâlâ FREQ_TOLERANCE_OCT'tan büyük — invaryant kırılmadı", () => {
    assert.ok(mode.KESIM_CURVE_CONFIG.STEP_OCT_FLOOR > mode.FREQ_TOLERANCE_OCT);
    assert.ok(mode.KESIM_CURVE_CONFIG.STEP_OCT_AT_CAP > mode.FREQ_TOLERANCE_OCT);
  });
});

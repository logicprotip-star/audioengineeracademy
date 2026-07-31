// "Frekans Bulma" modu — mevcut (tek/çok bantlı) EQ ear-training oyununun izole
// edilmiş hâli. Mod sözleşmesi: getMeta, createQuestion, applyProcessing,
// evaluateAnswer, calculateXP, getFeedbackData (bkz. README niteliğindeki yorumlar
// altta). createQuestion ve evaluateAnswer SAF fonksiyondur: ses çalmaz, DOM'a
// dokunmaz, sadece veri üretir/değerlendirir.
//
// Kontratın 6 fonksiyonunun ÜSTÜNE, bu modun kendine özgü dalga-tıklama arayüzünü
// (canvas eksen/EQ eğrisi çizimi, ipucu maskesi, bant-bilgi paneli) çalıştırmak için
// birkaç EK (opsiyonel) yardımcı fonksiyon daha dışa açılır. Bunlar sözleşmenin
// parçası değildir — sadece bu modun app.js tarafından nasıl render edileceğini
// tarif eder. Gelecekteki modların böyle bir arayüze ihtiyacı olmayabilir.

import { logFreq, shuffle, formatHz, hexToRgba } from "../core/utils.js";

export const MODE_ID = "frekans-bulma";

// hintBandOct: ipucu maskesinde doğru bandın etrafında AÇIK bırakılan tam genişlik
// (oktav). Kolayda geniş (bulması kolay), zorda dar (yine de zorlayıcı).
export const DIFFICULTY = {
  easy: { label: "Kolay", gain: 10, q: 0.9, xp: 16, options: 3, time: 16, lives: 5, hintBandOct: 2.4 },
  medium: { label: "Orta", gain: 8, q: 1.3, xp: 24, options: 4, time: 13, lives: 4, hintBandOct: 1.6 },
  hard: { label: "Zor", gain: 6, q: 2.5, xp: 36, options: 5, time: 11, lives: 3, hintBandOct: 1.0 },
  pro: { label: "Pro", gain: 4.5, q: 4.2, xp: 52, options: 6, time: 9, lives: 3, hintBandOct: 0.6 },
  proplus: { label: "Pro Plus (Çok Bantlı)", gain: 8, q: 3.2, xp: 45, options: 4, time: 20, lives: 3, hintBandOct: 1.0 }
};

// Kolay/Orta'da EQ değişimi sadece boost (pozitif gain) olsun — dar bir kesim komşu
// bandın yükselmiş gibi duyulmasına yol açıp yeni başlayanı kafa karıştırıyor.
export const BOOST_ONLY_DIFFICULTIES = new Set(["easy", "medium"]);

// --- Frekans bölgesi bilgileri — cevap sonrası öğretici ipucu ---
export const FA_ZONES = [
  { a: 20, b: 120, t: "SUB (20–120 Hz)", tip: "Gövde ve güç. Kick ve bas burada yaşar. Yükseltince ağırlık/derinlik gelir; fazlası çamur ve boğukluk, azı cılızlık yapar." },
  { a: 120, b: 500, t: "BAS (120–500 Hz)", tip: "Doluluk ve sıcaklık. 200–400 Hz birikirse 'çamur' hissi verir; mix'te en çok kesilen bölge. Yükseltmek sesi kalınlaştırır, kesmek temizler." },
  { a: 500, b: 2000, t: "ORTA (500 Hz–2 kHz)", tip: "Enstrümanların gövdesi ve vokal netliği. 800 Hz–1 kHz fazlaysa 'kutu / telefon' sesi olur. Kesmek açar, yükseltmek öne çıkarır ama abartısı burun sesi yapar." },
  { a: 2000, b: 8000, t: "ÜST-ORTA (2–8 kHz)", tip: "Netlik, atak, sertlik. Kulağın en hassas bölgesi (2–4 kHz). Yükseltmek anlaşılırlık ve parlaklık katar; fazlası yorucu ve batıcı olur, tıslama artar." },
  { a: 8000, b: 20000, t: "TİZ / HAVA (8–20 kHz)", tip: "Parlaklık ve hava. Yükseltmek açıklık ve 'pahalı' his verir; azı boğuk, fazlası tiz ve cırtlak. Vokale hava burada eklenir." }
];

export function faZoneOf(f) {
  return FA_ZONES.find(z => f >= z.a && f < z.b) || FA_ZONES[FA_ZONES.length - 1];
}

// İpucu chip'inde gösterilecek kısa bölge adı (FA_ZONES'un uzun tip metninden bağımsız).
const HINT_ZONE_SHORT = { SUB: "Sub bas", BAS: "Bas", ORTA: "Orta", "ÜST-ORTA": "Üst-orta", "TİZ / HAVA": "Tiz" };
export function hintZoneLabel(freq) {
  const zone = faZoneOf(freq);
  return HINT_ZONE_SHORT[zone.t.split(" (")[0]] || zone.t.split(" (")[0];
}

// --- wave üzerine tıklayarak tahmin: eksen sabitleri ---
// FA_MIN/FA_MAX, createQuestion()/buildProPlusBands()'teki GERÇEK soru havuzuyla
// (logFreq(80, 17000)) birebir eşleşir.
export const FA_MIN = 80, FA_MAX = 17000;
export const faXToF = (x, w) => FA_MIN * Math.pow(FA_MAX / FA_MIN, x / w);
export const faFToX = (f, w) => w * Math.log(f / FA_MIN) / Math.log(FA_MAX / FA_MIN);
const FA_TICKS_ALL = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
// app.js'in spektrum çubuklarını eksen şeridiyle hizalayabilmesi için dışa açık
// (bkz. drawVisualizer: barlar AXIS_H kadar üstte durur, eksen etiketleri altta kalır).
export const AXIS_H = 50;
const AXIS_FONT_PX = 22;
const LABEL_FONT_PX = 32;
const LABEL_Y = 50;
const CLOSENESS_FONT_PX = 28;
const CLOSENESS_Y = 104;
const CURVE_TOP = 122;

// ═══════════════════════════════════════════════════════════════════════════
// MOD SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════

export function getMeta() {
  return {
    id: MODE_ID,
    ad: "Frekans Bulma",
    aciklama: "EQ ile değiştirilen frekansı A/B karşılaştırmasıyla dinleyip dalga üzerinde işaretle.",
    motor: 1,
    kulaklikGerekli: true,
    uyumluKaynaklar: ["pink", "white", "saw", "square", "triangle", "upload"],
    ucretsiz: true,
    videoUrl: "",
    difficulty: DIFFICULTY
  };
}

export function isBossRound(roundsCompleted) {
  return (roundsCompleted + 1) % 5 === 0;
}

// Pro Plus için birbirinden ayrık `count` bant üret (frekanslar üst üste binmesin).
export function buildProPlusBands(count, gainAbs) {
  const bands = [];
  let tries = 0;
  while (bands.length < count && tries < 200) {
    tries++;
    const f = logFreq(80, 17000);
    // en az ~0.9 oktav aralık bırak ki ayırt edilebilsin
    if (bands.some(b => Math.abs(Math.log2(f / b.freq)) < 0.9)) continue;
    const sign = Math.random() > 0.5 ? 1 : -1;
    bands.push({ freq: f, gain: gainAbs * sign, q: 3.2, matched: false });
  }
  bands.sort((a, b) => a.freq - b.freq);
  return bands;
}

// SAF FONKSİYON: ses çalmaz, DOM'a dokunmaz — sadece veri üretir.
// level: DIFFICULTY anahtarlarından biri ("easy" | "medium" | "hard" | "pro" | "proplus")
// settings: { source: "pink"|"white"|"saw"|"square"|"triangle"|"upload", boss: boolean }
export function createQuestion(level, settings = {}) {
  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const boss = !!settings.boss;
  const source = settings.source || "pink";

  // ---- PRO PLUS: 4 bant, sadece frekans işaretleme ----
  if (level === "proplus") {
    const gainAbs = boss ? diff.gain * 0.85 : diff.gain;
    const bands = buildProPlusBands(4, Math.max(6, gainAbs));
    return {
      mode: "proplus",
      difficulty: level,
      bands,
      guesses: [],
      source, hintUsed: false, boss
    };
  }

  // ---- FREKANS (tek bant) ----
  const freq = logFreq(80, 17000);
  // Kolay/Orta'da sadece boost (kesim yok) — dar bir kesim komşu bandın yükselmiş gibi
  // duyulmasına yol açıp yeni başlayanı kafa karıştırıyor. Zor ve üstünde ikisi de var.
  const gainSign = BOOST_ONLY_DIFFICULTIES.has(level) ? 1 : (Math.random() > 0.5 ? 1 : -1);
  const baseGain = boss ? diff.gain * 0.75 : diff.gain;
  const gain = baseGain * gainSign;
  const q = boss ? diff.q * 1.35 : diff.q;

  return {
    mode: "frequency",
    difficulty: level,
    filterType: "peaking",
    filterLabel: "Bell",
    freq,
    gain,
    q,
    source,
    hintUsed: false,
    boss
  };
}

export function modeDescription(q) {
  if (q.mode === "proplus") {
    return `A/B ile karşılaştır: 4 frekansla oynandı (kimi açık, kimi kısık). Dört noktayı da işaretle.`;
  }
  return `A/B ile karşılaştır, farkın en belirgin olduğu frekansı dalga üzerinde işaretle.`;
}

export function correctLabel(q) {
  if (q.mode === "proplus") return "4 bant";
  return formatHz(q.freq);
}

// Soruda uygulanan peaking filtre(leri) audioCtx üzerinde kurar. Ses zinciri BURADA
// devreye girer (audio-engine.js bu filtreleri sourceMix→...→compressor arasına bağlar).
export function applyProcessing(question, { audioCtx }) {
  const filters = [];
  if (question.mode === "proplus" && question.bands) {
    question.bands.forEach(b => {
      const f = audioCtx.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = b.freq;
      f.Q.value = b.q;
      f.gain.value = b.gain;
      filters.push(f);
    });
  } else {
    const f = audioCtx.createBiquadFilter();
    f.type = "peaking";
    f.frequency.value = question.freq;
    f.Q.value = question.q;
    f.gain.value = question.gain;
    filters.push(f);
  }
  return { filters };
}

// SAF FONKSİYON: sadece hesap yapar.
// answer: "frequency" modunda tek bir Hz sayısı; "proplus" modunda Hz dizisi (guesses).
// Dönen sonuç nesnesi getFeedbackData ve calculateXP tarafından tekrar kullanılır.
export function evaluateAnswer(question, answer) {
  if (question.mode === "proplus") {
    const bands = question.bands.map(b => ({ ...b, matched: false, guessHz: null, dOct: null }));
    const guesses = Array.isArray(answer) ? answer.slice() : [];
    guesses.forEach(gHz => {
      let bi = -1, best = Infinity;
      bands.forEach((b, i) => {
        if (b.matched) return;
        const d = Math.abs(Math.log2(gHz / b.freq));
        if (d < best) { best = d; bi = i; }
      });
      if (bi >= 0) { bands[bi].matched = true; bands[bi].guessHz = gHz; bands[bi].dOct = best; }
    });

    let hit = 0;
    bands.forEach(b => {
      b.correct = b.dOct !== null && b.dOct <= 0.5;
      if (b.correct) hit++;
    });
    const allOk = hit === bands.length;

    return {
      mode: "proplus",
      correct: hit >= 3,
      allOk,
      hit,
      bandCount: bands.length,
      bands
    };
  }

  const guessHz = answer;
  const dOct = Math.abs(Math.log2(guessHz / question.freq));
  const ok = dOct <= 0.5; // yarım oktav içi = doğru
  const zone = faZoneOf(question.freq);
  const act = question.gain >= 0 ? "yükseltildi ▲" : "kesildi ▼";
  const dir = guessHz > question.freq ? "daha tiz seçtin" : "daha pes seçtin";
  const quality = dOct <= 0.17 ? "🎯 Tam isabet!" : (dOct <= 0.33 ? "Çok iyi!" : "Doğru!");

  return { mode: "frequency", correct: ok, dOct, zone, act, dir, quality, guessHz };
}

// context: { combo, timeLeft, roundDuration, xpMultiplier } — round-flow/challenge
// tarafından yürütülen ANLIK durum. Bu değerler soru nesnesinin bir parçası DEĞİLDİR
// (dolayısıyla createQuestion'da yer almazlar); XP formülü tur içi combo/süre/bölüm
// çarpanına bağlı olduğu için burada ayrı parametre olarak alınır.
export function calculateXP(question, result, hintUsed, level, context = {}) {
  if (!result || !result.correct) return 0;

  const diff = DIFFICULTY[level] || DIFFICULTY.medium;
  const combo = context.combo || 0;
  const timeLeft = context.timeLeft || 0;
  const roundDuration = context.roundDuration || 0;
  const xpMultiplier = context.xpMultiplier || 1;

  const base = diff.xp;
  const comboBoost = Math.min(2.4, 1 + combo * 0.12);
  const hintPenalty = hintUsed ? 0.5 : 1;
  const bossBoost = question.boss ? 1.65 : 1;
  const timeBoost = timeLeft > roundDuration * 0.55 ? 1.2 : 1;

  const raw = Math.round(base * comboBoost * hintPenalty * bossBoost * timeBoost * xpMultiplier);

  if (question.mode === "proplus") {
    const ratio = result.hit / result.bandCount;
    return Math.max(0, Math.round(raw * ratio * 1.5));
  }
  return Math.max(0, raw);
}

// context: { gained } — calculateXP çıktısı (metinde "+N XP" göstermek için gerekir,
// bu yüzden çağrı sırası her zaman evaluateAnswer → calculateXP → getFeedbackData'dır).
export function getFeedbackData(question, answer, context = {}) {
  const result = evaluateAnswer(question, answer);
  const gained = context.gained || 0;

  if (result.mode === "proplus") {
    if (result.correct) {
      return {
        result,
        title: result.allOk ? "🎯 Dördü de doğru!" : `İyi! ${result.hit}/4 doğru`,
        detail: `+${gained} XP kazandın.`,
        showResult: true,
        panel: { ok: true, hit: result.hit, bands: result.bands }
      };
    }
    return {
      result,
      title: "Kaçtı — ama öğren:",
      detail: `${result.hit}/4 doğru. Aşağıda dört bandın yerini gör.`,
      showResult: true,
      panel: { ok: false, hit: result.hit, bands: result.bands }
    };
  }

  if (result.correct) {
    return {
      result,
      title: result.quality,
      detail: `${formatHz(question.freq)} ${result.act} · ${result.zone.t}. ${result.zone.tip} (+${gained} XP)`,
      showResult: true,
      panel: {
        ok: true,
        color: "var(--green)",
        head: `✅ ${formatHz(question.freq)} ${result.act} · +${gained} XP`,
        zone: result.zone
      }
    };
  }
  return {
    result,
    title: "Kaçtı — ama öğren:",
    detail: `Doğru ${formatHz(question.freq)} ${result.act}, sen ${formatHz(result.guessHz)} dedin (${result.dOct.toFixed(2)} oktav, ${result.dir}). ${result.zone.t}: ${result.zone.tip}`,
    showResult: true,
    panel: {
      ok: false,
      color: "var(--red)",
      head: `❌ Doğru: ${formatHz(question.freq)} ${result.act} · sen ${formatHz(result.guessHz)} dedin (${result.dir})`,
      zone: result.zone
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SÖZLEŞMENİN DIŞINDA: bu moda özgü render/UI yardımcıları (opsiyonel).
// Sözleşmenin 6 fonksiyonu bunlara bağımlı DEĞİLDİR; app.js bu modu ekrana
// dökebilmek için ayrıca bunları kullanır.
// ═══════════════════════════════════════════════════════════════════════════

export function getHintText(question) {
  const centers = question.mode === "proplus" && question.bands
    ? question.bands.map(b => b.freq)
    : [question.freq];
  return centers.map(hintZoneLabel).join(" / ");
}

export function recordZone(zoneStats, freq, correct) {
  const z = FA_ZONES.find(zz => freq >= zz.a && freq < zz.b);
  if (!z) return zoneStats;
  const key = z.t.split(" (")[0];
  zoneStats[key] = zoneStats[key] || { n: 0, ok: 0 };
  zoneStats[key].n++;
  if (correct) zoneStats[key].ok++;
  return zoneStats;
}

// Kişisel analiz: bölge bölge başarıyı okuyup güçlü/zayıf bölgeyi anlatan HTML döndürür.
export function renderAnalysisHtml(zoneStats) {
  const entries = Object.entries(zoneStats).filter(([, v]) => v.n >= 2);
  if (entries.length < 2) {
    const total = Object.values(zoneStats).reduce((s, v) => s + v.n, 0);
    return total === 0
      ? `Birkaç tur oyna, kulağının hangi frekans bölgesinde güçlü/zayıf olduğunu burada göstereceğim.`
      : `Analiz için biraz daha veri topluyorum… (${total} deneme)`;
  }
  const scored = entries.map(([k, v]) => ({ k, pct: Math.round((v.ok / v.n) * 100), n: v.n }))
    .sort((a, b) => a.pct - b.pct);
  const weak = scored[0], strong = scored[scored.length - 1];
  const bars = scored.map(s => {
    const col = s.pct >= 70 ? "var(--green)" : s.pct >= 45 ? "var(--yellow)" : "var(--red)";
    return `<div style="display:flex;align-items:center;gap:8px;margin-top:5px">
      <span style="width:70px;color:var(--muted);font-size:11px">${s.k}</span>
      <div style="flex:1;height:7px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden">
        <i style="display:block;height:100%;width:${s.pct}%;background:${col}"></i></div>
      <span style="width:34px;text-align:right;font-family:'JetBrains Mono';font-size:11px;color:${col}">${s.pct}%</span>
    </div>`;
  }).join("");
  return `<div style="margin-bottom:8px">En zayıf bölgen <b style="color:var(--red)">${weak.k}</b> (%${weak.pct}). En güçlü: <b style="color:var(--green)">${strong.k}</b> (%${strong.pct}).</div>` +
    bars +
    `<div style="margin-top:9px;color:var(--cyan);font-size:12px">💡 Öneri: bir süre <b>${weak.k}</b> aralığına odaklan; A/B'yi bol kullanıp farkı yakala.</div>`;
}

export function renderHintMask(hintMaskLayerEl, question) {
  if (!hintMaskLayerEl || !question) return;
  const diff = DIFFICULTY[question.difficulty] || DIFFICULTY.medium;
  const halfOct = (diff.hintBandOct || 1.4) / 2;
  const centers = question.mode === "proplus" && question.bands
    ? question.bands.map(b => b.freq)
    : [question.freq];

  const clearRanges = centers.map(f => {
    const lo = Math.max(FA_MIN, f / Math.pow(2, halfOct));
    const hi = Math.min(FA_MAX, f * Math.pow(2, halfOct));
    return [faFToX(lo, 1), faFToX(hi, 1)];
  }).sort((a, b) => a[0] - b[0]);

  const merged = [];
  clearRanges.forEach(r => {
    if (merged.length && r[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1]);
    } else merged.push(r.slice());
  });

  const segs = [];
  let cursor = 0;
  merged.forEach(([a, b]) => {
    if (a > cursor) segs.push([cursor, a]);
    cursor = Math.max(cursor, b);
  });
  if (cursor < 1) segs.push([cursor, 1]);

  hintMaskLayerEl.innerHTML = "";
  segs.forEach(([a, b]) => {
    const div = document.createElement("div");
    div.className = "hint-mask-seg";
    div.style.left = `${(a * 100).toFixed(2)}%`;
    div.style.width = `${((b - a) * 100).toFixed(2)}%`;
    hintMaskLayerEl.appendChild(div);
  });

  // Segmentler opacity:0 ile DOM'a eklendi; zorla reflow + hemen ardından .show
  // eklemek CSS transition'ı tetikler (requestAnimationFrame yerine — sekme arka
  // plandayken/odaksızken rAF ertelenebiliyor, offsetHeight okuması ise her zaman senkron).
  void hintMaskLayerEl.offsetHeight;
  hintMaskLayerEl.querySelectorAll(".hint-mask-seg").forEach(el => el.classList.add("show"));
}

export function clearHintMask(hintMaskLayerEl) {
  if (hintMaskLayerEl) hintMaskLayerEl.innerHTML = "";
}

export function renderGuessAreaControls(freqGuessAreaEl, q) {
  if (q.mode !== "proplus") {
    freqGuessAreaEl.innerHTML = `<span style="color:var(--cyan);font-size:14px;font-weight:700">👆 Dalga üzerine tıklayarak doğru frekansı işaretle</span>`;
    return;
  }
  freqGuessAreaEl.innerHTML = `<span id="ppCount" style="color:var(--cyan);font-size:14px;font-weight:700">👆 Dört ayrı frekansı işaretle · kalan: 4</span>`;
}

export function showFreqInfoPanel(freqInfoEl, feedback) {
  if (!freqInfoEl || !feedback.panel) return;
  const { ok, head, zone } = feedback.panel;
  const color = ok ? "var(--green)" : "var(--red)";
  freqInfoEl.style.borderColor = color;
  freqInfoEl.style.background = ok ? "rgba(104,240,171,.10)" : "rgba(255,108,136,.10)";
  freqInfoEl.innerHTML =
    `<div style="font-weight:800;color:${color};margin-bottom:6px;font-size:15px">${head}</div>` +
    `<div style="font-weight:700;color:var(--text);margin-bottom:4px">${zone.t}</div>` +
    `<div style="color:var(--muted);font-size:13.5px;line-height:1.55">${zone.tip}</div>`;
  freqInfoEl.classList.remove("hidden");
}

export function showProPlusInfoPanel(freqInfoEl, feedback) {
  if (!freqInfoEl || !feedback.panel) return;
  const { ok, hit, bands } = feedback.panel;
  const color = ok ? "var(--green)" : "var(--red)";
  freqInfoEl.style.borderColor = color;
  freqInfoEl.style.background = ok ? "rgba(104,240,171,.10)" : "rgba(255,108,136,.10)";
  const rows = bands.map(b => {
    const act = b.gain >= 0 ? "▲ açık" : "▼ kısık";
    const zone = faZoneOf(b.freq);
    const dogru = b.dOct !== null && b.dOct <= 0.5;
    const mark = dogru ? "✅" : "❌";
    const senin = b.guessHz ? `sen: ${formatHz(b.guessHz)}` : "işaretlemedin";
    return `<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,.08)">
      <b style="color:${dogru ? "var(--green)" : "var(--red)"}">${mark} ${formatHz(b.freq)} ${act}</b>
      <span style="color:var(--muted)">· ${zone.t.split(" (")[0]} · ${senin}</span></div>`;
  }).join("");
  freqInfoEl.innerHTML = `<div style="font-weight:800;color:${color};margin-bottom:4px;font-size:15px">${hit}/4 doğru</div>` + rows;
  freqInfoEl.classList.remove("hidden");
}

// 4 bandı tek tek aç: her açılışta ding/buzz + parlama animasyonu.
export function createRevealAnimator({ sfxDing, sfxBuzz }) {
  let count = 0;
  let glow = 0;
  let resultBands = null;

  function start(bandsSortedByFreq) {
    resultBands = bandsSortedByFreq;
    count = 0;
    glow = 0;
    openNext();
  }

  function openNext() {
    if (!resultBands || count >= resultBands.length) return;
    count++;
    const b = resultBands[count - 1];
    if (b.correct) sfxDing(); else sfxBuzz();
    glow = 1;
    const t0 = performance.now();
    (function fade(t) {
      glow = Math.max(0, 1 - (t - t0) / 300);
      if (glow > 0) requestAnimationFrame(fade);
    })(t0);
    if (count < resultBands.length) setTimeout(openNext, 340);
  }

  function reset() {
    count = 0;
    glow = 0;
    resultBands = null;
  }

  return {
    start,
    reset,
    get count() { return count; },
    get glow() { return glow; }
  };
}

// --- canvas çizim yardımcıları ---

function roundRectPath(ctx2d, x, y, w, h, r) {
  ctx2d.beginPath();
  ctx2d.moveTo(x + r, y);
  ctx2d.arcTo(x + w, y, x + w, y + h, r);
  ctx2d.arcTo(x + w, y + h, x, y + h, r);
  ctx2d.arcTo(x, y + h, x, y, r);
  ctx2d.arcTo(x, y, x + w, y, r);
  ctx2d.closePath();
}

function drawPillLabel(ctx2d, text, x, y, bg, fg, font, fontSizePx, clampW) {
  ctx2d.font = font;
  ctx2d.textAlign = "center";
  const padX = 16, padY = 10;
  const tw = ctx2d.measureText(text).width;
  const rw = tw + padX * 2;
  const rh = fontSizePx + padY * 2;
  let cx = x;
  if (typeof clampW === "number") {
    const half = rw / 2;
    if (cx - half < 4) cx = 4 + half;
    if (cx + half > clampW - 4) cx = clampW - 4 - half;
  }
  roundRectPath(ctx2d, cx - rw / 2, y - fontSizePx - padY + 2, rw, rh, rh / 2);
  ctx2d.fillStyle = bg;
  ctx2d.fill();
  ctx2d.fillStyle = fg;
  ctx2d.fillText(text, cx, y);
  ctx2d.textAlign = "left";
}

let _faTicksCache = { key: null, ticks: FA_TICKS_ALL };
function pickFreqTicks(ctx2d, canvasEl, w) {
  const cssW = canvasEl.getBoundingClientRect().width || w;
  const cacheKey = w + ":" + Math.round(cssW);
  if (_faTicksCache.key === cacheKey) return _faTicksCache.ticks;

  ctx2d.font = `700 ${AXIS_FONT_PX}px 'JetBrains Mono', monospace`;
  const scale = cssW / w;
  const minGapInternal = 64 / Math.max(0.05, scale);

  function fits(arr) {
    let lastRight = -Infinity;
    for (const f of arr) {
      const label = f >= 1000 ? (f / 1000) + "k" : String(f);
      const halfW = ctx2d.measureText(label).width / 2;
      const x = faFToX(f, w);
      if (x - halfW < lastRight) return false;
      lastRight = x + halfW + minGapInternal;
    }
    return true;
  }
  let ticks = FA_TICKS_ALL.slice();
  while (ticks.length > 3 && !fits(ticks)) {
    ticks = ticks.filter((_, i) => i % 2 === 0);
  }
  _faTicksCache = { key: cacheKey, ticks };
  return ticks;
}

function drawFreqAxis(ctx2d, canvasEl, w, h) {
  const plotBottom = h - AXIS_H;
  const labelY = h - 16;
  const font = `700 ${AXIS_FONT_PX}px 'JetBrains Mono', monospace`;
  ctx2d.font = font;
  pickFreqTicks(ctx2d, canvasEl, w).forEach(f => {
    const x = faFToX(f, w);
    ctx2d.strokeStyle = "rgba(255,255,255,.10)";
    ctx2d.beginPath(); ctx2d.moveTo(x, 6); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
    const label = f >= 1000 ? (f / 1000) + "k" : String(f);
    drawPillLabel(ctx2d, label, x, labelY, "rgba(8,13,22,.82)", "#eef6ff", font, AXIS_FONT_PX, w);
  });
}

// Soruda uygulanan peaking filtre(ler)in gerçek frekans yanıtını (dB) hesaplar.
// Pro Plus'ta bantlar seri bağlı olduğundan toplam yanıt dB'lerin TOPLAMIdır.
function getEqCurveForQuestion(audioCtx, q, w) {
  if (!audioCtx) return null;
  if (q._eqCurveCache && q._eqCurveCache.w === w) return q._eqCurveCache.db;
  const specs = q.mode === "proplus" && q.bands
    ? q.bands.map(b => ({ freq: b.freq, q: b.q, gain: b.gain }))
    : [{ freq: q.freq, q: q.q, gain: q.gain }];
  const N = 160;
  const freqs = new Float32Array(N);
  for (let i = 0; i < N; i++) freqs[i] = faXToF((i / (N - 1)) * w, w);
  const totalDb = new Float32Array(N);
  const mag = new Float32Array(N);
  const phase = new Float32Array(N);
  specs.forEach(spec => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "peaking";
    filter.frequency.value = spec.freq;
    filter.Q.value = spec.q;
    filter.gain.value = spec.gain;
    filter.getFrequencyResponse(freqs, mag, phase);
    for (let i = 0; i < N; i++) totalDb[i] += 20 * Math.log10(Math.max(mag[i], 1e-6));
  });
  q._eqCurveCache = { w, db: totalDb };
  return totalDb;
}

function drawEqResponseCurve(ctx2d, audioCtx, w, h, q) {
  const db = getEqCurveForQuestion(audioCtx, q, w);
  if (!db) return;
  const N = db.length;
  const maxAbsDb = 15;
  const plotBottom = h - AXIS_H;
  const curveTop = CURVE_TOP, curveBottom = plotBottom - 6;
  const midY = curveTop + (curveBottom - curveTop) * 0.55;
  const bandH = (curveBottom - curveTop) * 0.42;
  const yAt = i => {
    const d = Math.max(-maxAbsDb, Math.min(maxAbsDb, db[i]));
    return midY - (d / maxAbsDb) * bandH;
  };

  ctx2d.save();
  ctx2d.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * w;
    if (i === 0) ctx2d.moveTo(x, yAt(i)); else ctx2d.lineTo(x, yAt(i));
  }
  ctx2d.lineTo(w, midY);
  ctx2d.lineTo(0, midY);
  ctx2d.closePath();
  ctx2d.fillStyle = "rgba(255,209,102,.14)";
  ctx2d.fill();

  ctx2d.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * w;
    if (i === 0) ctx2d.moveTo(x, yAt(i)); else ctx2d.lineTo(x, yAt(i));
  }
  ctx2d.strokeStyle = "#ffd166";
  ctx2d.lineWidth = 2;
  ctx2d.globalAlpha = 0.85;
  ctx2d.stroke();
  ctx2d.restore();
}

// Tahmin ile doğru cevap arasındaki mesafeyi OKTAV cinsinden değerlendirip (lineer Hz
// DEĞİL) renkli bir bant + kısa metinle gösterir. Eşikler puanlamayla aynı (0.17/0.5 oktav).
function drawClosenessBand(ctx2d, w, h, q, guessHz) {
  const dOct = Math.abs(Math.log2(guessHz / q.freq));
  let color, text;
  if (dOct <= 0.17) { color = "#68f0ab"; text = "çok yakın"; }
  else if (dOct <= 0.5) { color = "#ffb347"; text = "yakın"; }
  else { color = "#ff6c88"; text = "uzak"; }

  const plotBottom = h - AXIS_H;
  const x1 = faFToX(guessHz, w);
  const x2 = faFToX(q.freq, w);
  const left = Math.min(x1, x2), right = Math.max(x1, x2);
  const top = CURVE_TOP, bottom = plotBottom - 6;

  ctx2d.fillStyle = hexToRgba(color, 0.16);
  ctx2d.fillRect(left, top, Math.max(2, right - left), bottom - top);

  const midX = (left + right) / 2;
  const font = `800 ${CLOSENESS_FONT_PX}px 'JetBrains Mono', monospace`;
  drawPillLabel(ctx2d, text, midX, CLOSENESS_Y, hexToRgba(color, 0.92), "#0b1220", font, CLOSENESS_FONT_PX, w);
}

// Tur boyunca canvas üzerine dalga/EQ eğrisinin ÜSTÜNE binen; tahmin/cevap/hint
// katmanı. drawVisualizer (core/app.js) tarafından her karede çağrılır.
// state: { audioCtx, activeQuestion, roundActive, freqGuessHz, freqHoverHz, revealAnimator }
export function drawOverlay(ctx2d, canvasEl, w, h, state) {
  const { audioCtx, activeQuestion: q, roundActive, freqGuessHz, freqHoverHz, revealAnimator } = state;
  drawFreqAxis(ctx2d, canvasEl, w, h);
  if (!q) return;

  const plotBottom = h - AXIS_H;

  if (freqHoverHz && roundActive) {
    const x = faFToX(freqHoverHz, w);
    ctx2d.strokeStyle = "rgba(111,211,255,.55)";
    ctx2d.setLineDash([4, 4]);
    ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
    ctx2d.setLineDash([]);
  }

  // ---- PRO PLUS çok bantlı ----
  if (q.mode === "proplus" && q.bands) {
    if (!roundActive && q.freqRevealed && q._result) {
      drawEqResponseCurve(ctx2d, audioCtx, w, h, q);
    }
    (q.guesses || []).forEach(gHz => {
      const x = faFToX(gHz, w);
      ctx2d.strokeStyle = roundActive ? "#6fd3ff" : "rgba(111,211,255,.85)";
      ctx2d.lineWidth = roundActive ? 3 : 2;
      ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
      if (!roundActive) {
        drawPillLabel(ctx2d, "sen", x, plotBottom - 14, "rgba(15,23,32,.82)", "rgba(111,211,255,.95)",
          "700 18px 'JetBrains Mono', monospace", 18, w);
      }
    });
    if (!roundActive && q.freqRevealed && q._result && revealAnimator) {
      q._result.forEach((b, i) => {
        if (i >= revealAnimator.count) return;
        const x = faFToX(b.freq, w);
        const col = b.correct ? "#68f0ab" : "#ff6c88";
        const up = b.gain >= 0;
        if (i === revealAnimator.count - 1 && revealAnimator.glow > 0) {
          ctx2d.save();
          ctx2d.globalAlpha = revealAnimator.glow;
          ctx2d.strokeStyle = col; ctx2d.lineWidth = 10;
          ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke();
          ctx2d.restore();
        }
        ctx2d.strokeStyle = col; ctx2d.lineWidth = 3; ctx2d.setLineDash([5, 4]);
        ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, plotBottom); ctx2d.stroke(); ctx2d.setLineDash([]);
        drawPillLabel(ctx2d, (b.correct ? "✓ " : "✗ ") + (up ? "▲" : "▼") + formatHz(b.freq), x, up ? LABEL_Y : h / 2,
          "rgba(15,23,32,.82)", col, "800 20px 'JetBrains Mono', monospace", 20, w);
      });
    }
    return;
  }

  // ---- TEK BANT (frekans modu) ----
  const showGuess = freqGuessHz;
  const revealed = !roundActive && q.freqRevealed;

  if (revealed) {
    drawEqResponseCurve(ctx2d, audioCtx, w, h, q);
    if (showGuess) drawClosenessBand(ctx2d, w, h, q, showGuess);
  }

  const guessX = showGuess ? faFToX(showGuess, w) : null;
  const answerX = revealed ? faFToX(q.freq, w) : null;
  let guessDx = 0, answerDx = 0;
  if (guessX !== null && answerX !== null && Math.abs(guessX - answerX) < 110) {
    if (guessX <= answerX) { guessDx = -66; answerDx = 66; }
    else { guessDx = 66; answerDx = -66; }
  }

  const labelFont = `800 ${LABEL_FONT_PX}px 'JetBrains Mono', monospace`;
  if (showGuess) {
    ctx2d.strokeStyle = "#6fd3ff"; ctx2d.lineWidth = 3;
    ctx2d.beginPath(); ctx2d.moveTo(guessX, 4); ctx2d.lineTo(guessX, plotBottom); ctx2d.stroke();
    drawPillLabel(ctx2d, formatHz(showGuess), guessX + guessDx, LABEL_Y, "rgba(15,23,32,.88)", "#6fd3ff",
      labelFont, LABEL_FONT_PX, w);
  }
  if (revealed) {
    const up = q.gain >= 0;
    ctx2d.strokeStyle = "#ffd166"; ctx2d.lineWidth = 3; ctx2d.setLineDash([5, 4]);
    ctx2d.beginPath(); ctx2d.moveTo(answerX, 4); ctx2d.lineTo(answerX, plotBottom); ctx2d.stroke(); ctx2d.setLineDash([]);
    drawPillLabel(ctx2d, (up ? "▲ " : "▼ ") + formatHz(q.freq), answerX + answerDx, LABEL_Y, "rgba(15,23,32,.88)", "#ffd166",
      labelFont, LABEL_FONT_PX, w);
  }
}

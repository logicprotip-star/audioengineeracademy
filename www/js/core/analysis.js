// Araçlar ölçüm motoru — hesaplama çekirdeği. ARAYÜZ YOK, bu dosyadaki her
// fonksiyon SAF (ses/DOM'a dokunmaz, sadece Float32Array/nesne alıp sayı
// döndürür) — testler bunlara doğrudan sentetik sinyallerle dayanıyor.
//
// Girdi: upload.js'in decodeAudioData ile ürettiği GERÇEK AudioBuffer, YA DA
// aynı minimal arayüzü taklit eden herhangi bir nesne:
//   { sampleRate, numberOfChannels, length, getChannelData(ch) -> Float32Array }
// Testler bu arayüzü sentetik nesnelerle dolduruyor (Node'da gerçek AudioBuffer
// yok) — analyzeAudioBuffer() `instanceof AudioBuffer` KONTROLÜ YAPMAZ, sadece
// bu dört alanı okur.
//
// HEDEF (kullanıcının verdiği referans: iZotope RX Waveform Statistics +
// Loudness paneli, 11 parametre):
//   Kanal başına: true peak (dBTP), sample peak (dBFS), max/min/total RMS (dB),
//   possibly clipped samples (adet), DC offset (%).
//   Program geneli: max momentary / max short-term / integrated loudness (LUFS),
//   loudness range (LU).
//
// STANDARTLAR: ITU-R BS.1770-4 (K-weighting + gating + true peak kavramı),
// EBU R128 (terminoloji), EBU Tech 3342 (LRA algoritması).
//
// === K-WEIGHTING KATSAYI TÜRETİMİ — DÜRÜSTLÜK NOTU ===
// Standart RBJ Audio-EQ-Cookbook shelf/highpass formülleriyle DENENDİ, ITU'nun
// YAYINLADIĞI 48kHz referans katsayılarıyla (b0=1.53512485958697 vb.)
// UYUŞMADI (a1/a2 on hane doğru çıktı ama b0/b1/b2 sabit bir çarpanla kaydı —
// yani RBJ formülü BU filtre için doğru parametrizasyon değil). Bunun yerine
// K=tan(π·f0/fs) tabanlı ikinci bir bilineer-dönüşüm formülü (aşağıda) kullanıldı
// — bu, f0/G/Q=1681.9744509555319/3.99984385397/0.7071752369554193 (ön-filtre)
// ve f0/Q=38.13547087613982/0.5003270373238773 (RLB/high-pass) parametreleriyle
// 48000 Hz'de ITU'nun TÜM 5 katsayısını (b0,b1,b2,a1,a2) ONDALIK 10+ HANE
// doğrulukla üretiyor — bu modülün testinde SAYISAL olarak kilitlendi. Başka
// örnekleme hızlarında AYNI f0/G/Q ile AYNI formül yeniden katsayı üretir
// (fs değiştikçe K=tan(π·f0/fs) değişir, geri kalan cebir sabit) — bu,
// "48k değilse katsayılar yeniden türetilmeli" gereğini karşılar.
//
// === TRUE PEAK — DÜRÜSTLÜK NOTU ===
// BS.1770-4 Ek 2'nin resmi 4x polifaz FIR tablosunu (12 taps × 4 faz, ITU'nun
// KENDİ ölçtüğü katsayılar) BİREBİR uygulamıyoruz — o tabloyu güvenilir
// biçimde ezbere yazamayacağımız için (yanlış sayı üretme riski, bkz.
// CLAUDE.md "sayı uydurma") yerine GENEL AMAÇLI, kendi tasarladığımız 4x
// Kaiser-pencereli sinc ara değerleme filtresi kullanılıyor (bkz.
// designInterpolationFilter — polifaz ayrıştırmanın DC kazancı test edildi,
// her fazın kazancı 1.0'a ~5 ondalık basamak yakın, bkz. testler). Bu "en az
// 4x aşırı örnekleme" gereğini karşılıyor, ama ITU'nun resmi filtresiyle
// BİT-BİRE-BİR AYNI OLDUĞU İDDİA EDİLMİYOR.
// ÖLÇÜLEN SINIR (frekans taraması ile, bkz. testler): saf ton girdilerinde bu
// filtre gerçek (analitik) tepe değerinin EN FAZLA ~0.55dB ÜZERİNDE bir
// True Peak okuyabiliyor — en kötü durum ~%63 Nyquist civarında (44.1kHz'de
// ~14kHz, 48kHz'de ~15.3kHz), pencerelenmiş sinc'in kaçınılmaz geçiş-bandı
// dalgalanması (Gibbs benzeri). Bu YUKARI yönlü bir sapma (fazla okur,
// AZ okumaz) — kırpılma/inter-sample-over TESPİTİ için güvenli yöndedir
// (gerçek bir sorunu KAÇIRMAZ, ama sınıra yakın "temiz" bir sesi yanlışlıkla
// "az üstünde" gösterebilir). Referans bir True Peak metreyle örtüşme
// kullanıcının canlı karşılaştırmasıyla doğrulanmalı.
//
// === RMS KONVANSİYONU ===
// HAM (tam ölçekli sinüs → −3.01 dB) ve AES17 (tam ölçekli sinüs → 0 dB, HAM'a
// +3.0103 dB eklenir) İKİSİ DE hesaplanıp döndürülüyor — RX'in hangisini
// kullandığı bilinmiyor, kullanıcı kendi karşılaştırmasıyla seçecek.
//
// === BELLEK ===
// decodeAudioData'nın kendisi zaten TÜM dosyayı Float32 PCM olarak bellekte
// tutuyor (bu modülün kontrolü DIŞINDA, kaçınılmaz bir ön koşul). BU MODÜL
// buna ek olarak "tüm sinyalin K-ağırlıklı hali" / "tüm interpolasyon çıktısı"
// gibi dosya-boyutunda YENİ bir kopya ASLA tutmaz — CHUNK_SIZE'lık bloklar
// halinde akışkan (streaming) işlenir, sadece küçük O(1) durum (biquad
// state'leri, pencere biriktiricileri, FIR geçmişi) ve O(süre/100ms) büyüklüğünde
// (5 dakikalık dosyada ~3000 float = ~24KB) bir "blok gücü" dizisi tutulur.

const K_WEIGHT_PRE = { f0: 1681.9744509555319, G: 3.99984385397, Q: 0.7071752369554193 };
const K_WEIGHT_RLB = { f0: 38.13547087613982, Q: 0.5003270373238773 };

// SAF. ITU-R BS.1770-4'ün ön-filtre (yüksek raf) katsayılarını VERİLEN
// örnekleme hızı için türetir. K=tan(π·f0/fs) tabanlı bilineer dönüşüm —
// bkz. dosya başı not, 48000 Hz'de ITU referans tablosuyla test edildi.
function preFilterCoeffs(fs) {
  const { f0, G, Q } = K_WEIGHT_PRE;
  const K = Math.tan((Math.PI * f0) / fs);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1.0 + K / Q + K * K;
  const b0 = (Vh + (Vb * K) / Q + K * K) / a0;
  const b1 = (2.0 * (K * K - Vh)) / a0;
  const b2 = (Vh - (Vb * K) / Q + K * K) / a0;
  const a1 = (2.0 * (K * K - 1.0)) / a0;
  const a2 = (1.0 - K / Q + K * K) / a0;
  return { b0, b1, b2, a1, a2 };
}

// SAF. ITU-R BS.1770-4'ün RLB (yüksek geçiren) katsayılarını VERİLEN
// örnekleme hızı için türetir — bkz. preFilterCoeffs'teki not, aynı yöntem.
function rlbFilterCoeffs(fs) {
  const { f0, Q } = K_WEIGHT_RLB;
  const K = Math.tan((Math.PI * f0) / fs);
  const a0 = 1.0 + K / Q + K * K;
  const a1 = (2.0 * (K * K - 1.0)) / a0;
  const a2 = (1.0 - K / Q + K * K) / a0;
  return { b0: 1.0, b1: -2.0, b2: 1.0, a1, a2 };
}

// Direct Form I biquad, state {x1,x2,y1,y2} çağıran tarafta tutulur (kanal
// başına, iki kademe için AYRI iki state nesnesi gerekir).
function applyBiquad(state, c, x) {
  const y = c.b0 * x + c.b1 * state.x1 + c.b2 * state.x2 - c.a1 * state.y1 - c.a2 * state.y2;
  state.x2 = state.x1;
  state.x1 = x;
  state.y2 = state.y1;
  state.y1 = y;
  return y;
}

function newBiquadState() {
  return { x1: 0, x2: 0, y1: 0, y2: 0 };
}

// ---- True peak: 4x Kaiser-pencereli sinc ara değerleme filtresi ----
// Bkz. dosya başı "TRUE PEAK — DÜRÜSTLÜK NOTU". L=4 (aşırı örnekleme oranı),
// halfWidth=12 (orijinal-hız örnek cinsinden filtrenin tek taraflı açıklığı),
// beta=8.6 (Kaiser penceresi, ~85dB durdurma bandı zayıflatması hedefler).
const TRUE_PEAK_L = 4;
const TRUE_PEAK_HALF_WIDTH = 12;
const TRUE_PEAK_BETA = 8.6;

function besselI0(x) {
  let sum = 1;
  let term = 1;
  const xh = x / 2;
  for (let k = 1; k <= 200; k++) {
    term *= (xh * xh) / (k * k);
    sum += term;
    if (term < sum * 1e-15) break;
  }
  return sum;
}

// SAF. {taps: [Float64Array × L]} — her biri tapsPerPhase uzunluğunda polifaz
// alt-filtre. y[4n+p] = Σ_j taps[p][j] · x[n-j] (bkz. dosya başı türetme notu,
// testlerde her fazın DC kazancının ~1.0 olduğu doğrulandı).
function designInterpolationFilter(L, halfWidth, beta) {
  const numTaps = 2 * halfWidth * L;
  const center = (numTaps - 1) / 2;
  const denom = besselI0(beta);
  const h = new Float64Array(numTaps);
  for (let n = 0; n < numTaps; n++) {
    const x = (n - center) / L;
    const sincVal = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const arg = (n - center) / center;
    const w = besselI0(beta * Math.sqrt(Math.max(0, 1 - arg * arg))) / denom;
    h[n] = sincVal * w;
  }
  const tapsPerPhase = numTaps / L;
  const taps = [];
  for (let p = 0; p < L; p++) {
    const hp = new Float64Array(tapsPerPhase);
    for (let j = 0; j < tapsPerPhase; j++) hp[j] = h[p + j * L];
    taps.push(hp);
  }
  return { taps, tapsPerPhase, L };
}

let _interpFilterCache = null;
function getInterpolationFilter() {
  if (!_interpFilterCache) {
    _interpFilterCache = designInterpolationFilter(TRUE_PEAK_L, TRUE_PEAK_HALF_WIDTH, TRUE_PEAK_BETA);
  }
  return _interpFilterCache;
}

function newTruePeakState(filter) {
  return { history: new Float64Array(filter.tapsPerPhase - 1), maxAbs: 0 };
}

// Bir kanalın bir bloğunu (Float32Array görünümü, KOPYASIZ) işler, state'i
// (geçmiş örnekler + o ana kadarki maksimum) yerinde günceller.
function processTruePeakBlock(state, filter, samples) {
  const H = state.history.length;
  const n = samples.length;
  const combined = new Float64Array(H + n);
  combined.set(state.history, 0);
  for (let i = 0; i < n; i++) combined[H + i] = samples[i];
  let maxAbs = state.maxAbs;
  const { taps, tapsPerPhase, L } = filter;
  for (let idx = 0; idx < n; idx++) {
    const base = H + idx;
    for (let p = 0; p < L; p++) {
      const hp = taps[p];
      let acc = 0;
      for (let j = 0; j < tapsPerPhase; j++) acc += hp[j] * combined[base - j];
      const a = Math.abs(acc);
      if (a > maxAbs) maxAbs = a;
    }
  }
  if (H > 0) state.history.set(combined.subarray(combined.length - H));
  state.maxAbs = maxAbs;
}

// ---- "Possibly clipped samples" — ardışıklık kuralı ----
// Eşik ve ardışıklık kuralı RX'in kendi (belgelenmemiş) eşiğiyle BİREBİR
// TUTMAYI hedeflemiyor (task notu) — burada seçilen: |örnek| ≥ 0.9999
// (~ -0.00087 dBFS, tam ölçeğe pratik olarak eşit — 16-bit PCM'in tam
// ölçek uçları da bunun üzerinde kalır: 32767/32768 ≈ 0.999969) VE en az
// 3 ART ARDA örnek bu eşiği aşarsa "muhtemelen kırpılmış" sayılır (izole
// TEK bir tam-ölçek örneği gerçek bir tepe olabilir, kırpılma değil).
const CLIP_THRESHOLD = 0.9999;
const CLIP_MIN_CONSECUTIVE = 3;

// ---- Windowed RMS penceresi ----
// RX'in kullandığı pencere bilinmiyor (task notu) — burada seçilen: 300ms,
// klasik Type I VU-metre entegrasyon süresine yakın, yaygın bir "yavaş RMS"
// varsayılanı. `options.rmsWindowMs` ile override edilebilir.
const DEFAULT_RMS_WINDOW_MS = 300;

// ---- LUFS / gating sabitleri (ITU-R BS.1770-4 §5, EBU Tech 3342) ----
const GATING_BLOCK_MS = 100; // temel "blok gücü" adımı
const MOMENTARY_BLOCKS = 4; // 400ms / 100ms
const SHORT_TERM_BLOCKS = 30; // 3000ms / 100ms
const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_OFFSET_LU = -10; // integrated
const LRA_WINDOW_BLOCKS = 30; // 3s / 100ms
const LRA_STEP_BLOCKS = 10; // 1s / 100ms
const LRA_RELATIVE_GATE_OFFSET_LU = -20;
const LRA_LOW_PERCENTILE = 10;
const LRA_HIGH_PERCENTILE = 95;

function powerToLufs(power) {
  return power > 0 ? -0.691 + 10 * Math.log10(power) : -Infinity;
}
function lufsToPower(lufs) {
  return Math.pow(10, (lufs + 0.691) / 10);
}

function linearToDb(x) {
  return x > 0 ? 20 * Math.log10(x) : -Infinity;
}

// SAF. Sıralı sayı dizisinden doğrusal enterpolasyonlu yüzdelik (percentile,
// 0-100) hesaplar — "en yakın rütbe" değil, ara değer üretir (standart
// tanım belirsizliği burada bu yönde çözüldü, bkz. LRA testleri).
function percentile(sortedValues, p) {
  const n = sortedValues.length;
  if (n === 0) return NaN;
  if (n === 1) return sortedValues[0];
  const rank = (p / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedValues[lo];
  const frac = rank - lo;
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * frac;
}

// SAF. Ana giriş noktası. bufferLike: {sampleRate, numberOfChannels, length,
// getChannelData(ch)}. options: {chunkSize, rmsWindowMs}.
// Dönen nesne: { sampleRate, numberOfChannels, durationSec, channels: [...],
// program: {...}, meta: {...} }.
export function analyzeAudioBuffer(bufferLike, options = {}) {
  const sampleRate = bufferLike.sampleRate;
  const numberOfChannels = bufferLike.numberOfChannels;
  const length = bufferLike.length;
  if (numberOfChannels < 1 || numberOfChannels > 2) {
    throw new Error(
      `analyzeAudioBuffer: ${numberOfChannels} kanal desteklenmiyor (LUFS kanal ağırlıkları — bkz. ITU-R BS.1770-4 Tablo 1 — sadece mono/stereo için 1.0/1.0 olarak uygulandı, 3+ kanalda YANLIŞ sonuç üretmemek için hata fırlatılıyor).`
    );
  }
  const chunkSize = options.chunkSize || 131072;
  const rmsWindowMs = options.rmsWindowMs || DEFAULT_RMS_WINDOW_MS;
  const rmsWindowSamples = Math.max(1, Math.round((sampleRate * rmsWindowMs) / 1000));
  const gatingBlockSamples = Math.max(1, Math.round((sampleRate * GATING_BLOCK_MS) / 1000));

  const interpFilter = getInterpolationFilter();
  const preCoeffs = preFilterCoeffs(sampleRate);
  const rlbCoeffs = rlbFilterCoeffs(sampleRate);

  const channelStates = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channelStates.push({
      peakAbs: 0,
      dcSum: 0,
      dcCount: 0,
      totalSumSq: 0,
      totalCount: 0,
      rmsWindow: { sumSq: 0, count: 0 },
      rmsMaxDb: -Infinity,
      rmsMinDb: Infinity,
      clipRunLength: 0,
      clipCount: 0,
      truePeak: newTruePeakState(interpFilter),
      preState: newBiquadState(),
      rlbState: newBiquadState(),
    });
  }

  // Program-geneli K-ağırlıklı "blok gücü" serisi (100ms adım) — kanallar
  // arası SENKRON birikim gerektirir (bkz. dosya başı Faz B notu).
  const blockPowers = [];
  let gatingAccum = 0;
  let gatingAccumCount = 0;

  for (let offset = 0; offset < length; offset += chunkSize) {
    const n = Math.min(chunkSize, length - offset);
    const blocks = [];
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const data = bufferLike.getChannelData(ch);
      blocks.push(data.subarray(offset, offset + n));
    }

    // Faz A — kanal başına bağımsız istatistikler.
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const s = channelStates[ch];
      const block = blocks[ch];
      processTruePeakBlock(s.truePeak, interpFilter, block);
      for (let i = 0; i < n; i++) {
        const x = block[i];
        const ax = Math.abs(x);
        if (ax > s.peakAbs) s.peakAbs = ax;
        s.dcSum += x;
        s.dcCount++;
        s.totalSumSq += x * x;
        s.totalCount++;

        // windowed RMS
        const w = s.rmsWindow;
        w.sumSq += x * x;
        w.count++;
        if (w.count >= rmsWindowSamples) {
          const db = linearToDb(Math.sqrt(w.sumSq / w.count));
          if (db > s.rmsMaxDb) s.rmsMaxDb = db;
          if (db < s.rmsMinDb) s.rmsMinDb = db;
          w.sumSq = 0;
          w.count = 0;
        }

        // possibly clipped (ardışıklık)
        if (ax >= CLIP_THRESHOLD) {
          s.clipRunLength++;
          if (s.clipRunLength === CLIP_MIN_CONSECUTIVE) s.clipCount += CLIP_MIN_CONSECUTIVE;
          else if (s.clipRunLength > CLIP_MIN_CONSECUTIVE) s.clipCount += 1;
        } else {
          s.clipRunLength = 0;
        }
      }
    }

    // Faz B — kanallar arası senkron K-ağırlıklı gating birikimi.
    for (let i = 0; i < n; i++) {
      let sampleSum = 0;
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const s = channelStates[ch];
        const x = blocks[ch][i];
        const afterPre = applyBiquad(s.preState, preCoeffs, x);
        const afterRlb = applyBiquad(s.rlbState, rlbCoeffs, afterPre);
        sampleSum += afterRlb * afterRlb; // kanal ağırlığı 1.0 (mono/stereo)
      }
      gatingAccum += sampleSum;
      gatingAccumCount++;
      if (gatingAccumCount >= gatingBlockSamples) {
        blockPowers.push(gatingAccum / gatingAccumCount);
        gatingAccum = 0;
        gatingAccumCount = 0;
      }
    }
  }
  // Son eksik pencereyi (100ms'den kısa kalan kuyruk) AT — gating algoritması
  // tam bloklar üzerinde tanımlı, kısmi son blok istatistiği çarpıtır.

  // Kalan windowed-RMS artığı (bir sonraki tam pencereye ulaşamayan kuyruk):
  // eğer en az yarım pencere kadar örnek biriktiyse yine de sayılır (kısa
  // dosyalarda min/max hiç dolmasın diye), aksi halde atılır.
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const s = channelStates[ch];
    const w = s.rmsWindow;
    if (w.count >= rmsWindowSamples / 2 && w.count > 0) {
      const db = linearToDb(Math.sqrt(w.sumSq / w.count));
      if (db > s.rmsMaxDb) s.rmsMaxDb = db;
      if (db < s.rmsMinDb) s.rmsMinDb = db;
    }
  }

  // ---- Program geneli LUFS ----
  const momentarySeries = [];
  const shortTermSeries = [];
  for (let i = 0; i < blockPowers.length; i++) {
    if (i >= MOMENTARY_BLOCKS - 1) {
      let sum = 0;
      for (let k = i - MOMENTARY_BLOCKS + 1; k <= i; k++) sum += blockPowers[k];
      momentarySeries.push(sum / MOMENTARY_BLOCKS);
    }
    if (i >= SHORT_TERM_BLOCKS - 1) {
      let sum = 0;
      for (let k = i - SHORT_TERM_BLOCKS + 1; k <= i; k++) sum += blockPowers[k];
      shortTermSeries.push(sum / SHORT_TERM_BLOCKS);
    }
  }
  let maxMomentaryLufs = -Infinity;
  for (const p of momentarySeries) {
    const l = powerToLufs(p);
    if (l > maxMomentaryLufs) maxMomentaryLufs = l;
  }
  let maxShortTermLufs = -Infinity;
  for (const p of shortTermSeries) {
    const l = powerToLufs(p);
    if (l > maxShortTermLufs) maxShortTermLufs = l;
  }

  // Integrated loudness — iki aşamalı kapılama (ITU-R BS.1770-4 §5).
  // Gating blokları = momentarySeries (400ms pencere, 100ms adım).
  const absoluteGated = momentarySeries.filter((p) => powerToLufs(p) > ABSOLUTE_GATE_LUFS);
  let integratedLufs = -Infinity;
  if (absoluteGated.length > 0) {
    const meanAbs = absoluteGated.reduce((a, b) => a + b, 0) / absoluteGated.length;
    const relativeThreshold = powerToLufs(meanAbs) + RELATIVE_GATE_OFFSET_LU;
    const relGated = absoluteGated.filter((p) => powerToLufs(p) > relativeThreshold);
    if (relGated.length > 0) {
      const meanRel = relGated.reduce((a, b) => a + b, 0) / relGated.length;
      integratedLufs = powerToLufs(meanRel);
    } else {
      integratedLufs = powerToLufs(meanAbs);
    }
  }

  // LRA — EBU Tech 3342 (3s pencere, 1s adım, -70 mutlak + -20 göreli kapı,
  // P95-P10).
  const lraBlockLoudness = [];
  for (let i = 0; i + LRA_WINDOW_BLOCKS <= blockPowers.length; i += LRA_STEP_BLOCKS) {
    let sum = 0;
    for (let k = i; k < i + LRA_WINDOW_BLOCKS; k++) sum += blockPowers[k];
    lraBlockLoudness.push(sum / LRA_WINDOW_BLOCKS);
  }
  let lra = 0;
  const lraAbsGated = lraBlockLoudness.filter((p) => powerToLufs(p) > ABSOLUTE_GATE_LUFS);
  if (lraAbsGated.length > 0) {
    const meanAbs = lraAbsGated.reduce((a, b) => a + b, 0) / lraAbsGated.length;
    const relThreshold = powerToLufs(meanAbs) + LRA_RELATIVE_GATE_OFFSET_LU;
    const relGated = lraAbsGated.filter((p) => powerToLufs(p) > relThreshold);
    if (relGated.length > 0) {
      const loudnessValues = relGated.map(powerToLufs).sort((a, b) => a - b);
      lra = percentile(loudnessValues, LRA_HIGH_PERCENTILE) - percentile(loudnessValues, LRA_LOW_PERCENTILE);
    }
  }

  const labels = numberOfChannels === 1 ? ["Mono"] : ["L", "R"];
  const channels = channelStates.map((s, i) => {
    const totalRmsRawDb = linearToDb(Math.sqrt(s.totalSumSq / Math.max(1, s.totalCount)));
    return {
      label: labels[i],
      samplePeakDb: linearToDb(s.peakAbs),
      truePeakDb: linearToDb(s.truePeak.maxAbs),
      maxRmsDb: { raw: s.rmsMaxDb, aes17: s.rmsMaxDb === -Infinity ? -Infinity : s.rmsMaxDb + 3.0103 },
      minRmsDb: { raw: s.rmsMinDb, aes17: s.rmsMinDb === Infinity ? Infinity : s.rmsMinDb + 3.0103 },
      totalRmsDb: { raw: totalRmsRawDb, aes17: totalRmsRawDb === -Infinity ? -Infinity : totalRmsRawDb + 3.0103 },
      possiblyClippedSamples: s.clipCount,
      dcOffsetPercent: (s.dcSum / Math.max(1, s.dcCount)) * 100,
    };
  });

  return {
    sampleRate,
    numberOfChannels,
    durationSec: length / sampleRate,
    channels,
    program: {
      maxMomentaryLufs,
      maxShortTermLufs,
      integratedLufs,
      lra,
    },
    meta: {
      rmsWindowMs,
      clipThreshold: CLIP_THRESHOLD,
      clipMinConsecutive: CLIP_MIN_CONSECUTIVE,
      truePeakOversample: TRUE_PEAK_L,
      truePeakFilterTapsPerPhase: interpFilter.tapsPerPhase,
      gatingBlockMs: GATING_BLOCK_MS,
    },
  };
}

// Testler için dışa aktarılan iç fonksiyonlar (K-ağırlık katsayı türetimi,
// polifaz filtre tasarımı — bkz. test/analysis.test.mjs).
export const _internal = {
  preFilterCoeffs,
  rlbFilterCoeffs,
  designInterpolationFilter,
  percentile,
  besselI0,
};

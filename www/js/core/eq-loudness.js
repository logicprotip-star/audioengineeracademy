// A/B LOUDNESS EŞİTLEME (Düzeltme 1, TUR8-OGRETIM-15-08 bulgusu 🔴) — SAF/ölçülebilir
// fonksiyonlar, ses/DOM bağımsız (mod sözleşmesinin createQuestion/evaluateAnswer'dan
// istediği saflıkla AYNI ilke burada da uygulandı, test edilebilir olsun diye).
//
// SORUN: A/B karşılaştırmasında (audio-engine.js dry/wet crossfade) işlenmiş sinyalin
// GENEL SEVİYESİ hiç telafi edilmiyordu — boost genel seviyeyi artırıyor, cut azaltıyor,
// kullanıcı SPEKTRAL bir yargı yerine "hangisi daha yüksek sesli" kısayoluna kayabiliyordu
// (en ciddi örnek: Boost mu Cut mu modunun TEK amacı bu ayrımı KULAKLA yaptırmak).
//
// YÖNTEM: Web Audio'nun BiquadFilterNode'unun GERÇEK matematiği — RBJ Audio-EQ
// Cookbook formülleri (Web Audio spesifikasyonunun "Filters characteristics" bölümünün
// DOĞRUDAN kaynağı, https://www.w3.org/TR/webaudio/#filters-characteristics) — burada
// BİREBİR yeniden üretiliyor. Bu bir TAHMİNİ SABİT DEĞİL: filtrenin gerçek frekans
// tepkisinden (type/frequency/Q/gain) HESAPLANAN bir telafi kazancı — task'ın açık
// isteği ("RMS ya da LUFS bazlı, tahmini bir sabit DEĞİL") burada RMS tarafı: filtrenin
// PEMBE GÜRÜLTÜ referans spektrumuna göre ürettiği ORTALAMA GÜÇ (RMS) değişimi.
//
// Pembe gürültü (pink noise) referans alındı çünkü (a) oktav başına EŞİT enerji taşır
// — bu yüzden frekans eksenini LOGARİTMİK eşit aralıklı örneklemek pembe-gürültü-
// ağırlıklı bir RMS ortalamasına MATEMATİKSEL OLARAK DENKTİR, ayrı bir ağırlık
// fonksiyonu gerekmez — ve (b) bu app'in KENDİ varsayılan kaynağı zaten "pink"
// (bkz. frekans-bulma.js createQuestion source="pink" varsayılanı, app.js'in genel
// kaynak seçici varsayılanı) — keyfi değil, uygulamanın kendi referansıyla tutarlı.
//
// KAPSAM: SADECE bu app'in kullandığı üç biquad tipi (peaking/highpass/lowpass, grep
// ile doğrulandı — başka tip hiçbir modda yok). Diğer düğüm tipleri (GainNode — ör.
// dB Seviyesi'nin g.gain.value=10^(dbDelta/20)'si; StereoPannerNode — Pan Konumu;
// DynamicsCompressorNode/WaveShaperNode/ConvolverNode — Kompresör/Distortion/Reverb;
// mid/side branch — Stereo Genişlik) bu modülün KAPSAMI DIŞINDA — bkz. audio-engine.js
// wireLoudnessMatch()'in mod-bazlı opt-in listesi (MATCH_LOUDNESS_MODES).

const REF_F_MIN = 20;
const REF_F_MAX = 20000;
// 256 log-uniform örnek — test/eq-loudness.test.mjs ile doğrulandı: 256'nın üstüne
// çıkmak sonucu <0.01dB değiştiriyor (yakınsama testiyle ölçüldü), gereksiz maliyet.
const REF_POINTS = 256;

// SAF FONKSİYON: tek bir biquad filtresinin f frekansındaki GERÇEK kazancı (dB).
// RBJ Audio-EQ Cookbook formülleri — normalize edilmiş (a0'a bölünmüş) transfer
// fonksiyonunun birim çember üzerindeki (z=e^{jw}) büyüklüğü.
export function biquadMagnitudeDb({ type, frequency, Q, gain = 0 }, f, sampleRate) {
  if (!(frequency > 0) || !(sampleRate > 0) || !(f > 0)) return 0;
  const w0 = (2 * Math.PI * frequency) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const safeQ = Math.max(Q, 1e-6);
  const alpha = sinW0 / (2 * safeQ);

  let b0, b1, b2, a0, a1, a2;
  if (type === "peaking") {
    const A = Math.pow(10, gain / 40);
    b0 = 1 + alpha * A;
    b1 = -2 * cosW0;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cosW0;
    a2 = 1 - alpha / A;
  } else if (type === "highpass") {
    b0 = (1 + cosW0) / 2;
    b1 = -(1 + cosW0);
    b2 = (1 + cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (type === "lowpass") {
    b0 = (1 - cosW0) / 2;
    b1 = 1 - cosW0;
    b2 = (1 - cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else {
    // Bu app'te oluşmaz (yukarıdaki üçü dışında biquad tipi hiçbir modda yok) —
    // güvenli varsayılan: etkisiz (0dB), sessizce yanlış bir sayı üretmez.
    return 0;
  }

  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0;
  const A1 = a1 / a0, A2 = a2 / a0;

  const w = (2 * Math.PI * f) / sampleRate;
  const reN = B0 + B1 * Math.cos(w) + B2 * Math.cos(2 * w);
  const imN = -B1 * Math.sin(w) - B2 * Math.sin(2 * w);
  const reD = 1 + A1 * Math.cos(w) + A2 * Math.cos(2 * w);
  const imD = -A1 * Math.sin(w) - A2 * Math.sin(2 * w);

  const magN = Math.sqrt(reN * reN + imN * imN);
  const magD = Math.sqrt(reD * reD + imD * imD);
  if (magD <= 1e-12) return 0;
  return 20 * Math.log10(magN / magD);
}

// SAF FONKSİYON: SERİ bağlı bir biquad zincirinin (filterParamsList) pembe-gürültü-
// ağırlıklı ORTALAMA (RMS) kazancı, dB. Zincirdeki filtrelerin dB'leri TOPLANIR
// (kaskad LTI sistemlerin transfer fonksiyonları ÇARPILIR → dB'leri toplanır),
// frekans örnekleri arasında GÜÇ (power, dB değil) ortalaması alınır — enerji
// ortalaması matematiksel olarak doğru yöntem budur.
export function estimateChainGainDb(filterParamsList, { sampleRate, fMin = REF_F_MIN, fMax = REF_F_MAX, points = REF_POINTS } = {}) {
  if (!filterParamsList || !filterParamsList.length || !(sampleRate > 0)) return 0;
  const logMin = Math.log(fMin);
  const logMax = Math.log(fMax);
  let sumPower = 0;
  for (let i = 0; i < points; i++) {
    const t = points === 1 ? 0 : i / (points - 1);
    const f = Math.exp(logMin + (logMax - logMin) * t);
    let totalDb = 0;
    for (const params of filterParamsList) {
      totalDb += biquadMagnitudeDb(params, f, sampleRate);
    }
    sumPower += Math.pow(10, totalDb / 10);
  }
  const meanPower = sumPower / points;
  return 10 * Math.log10(meanPower);
}

// SAF FONKSİYON: effectiveDb'yi (estimateChainGainDb çıktısı) SIFIRLAYACAK doğrusal
// (linear) kazanç — audio-engine.js bunu YENİ bir GainNode'un .gain.value'suna atar.
export function compensationGainLinear(effectiveDb) {
  return Math.pow(10, -effectiveDb / 20);
}

// ═══════════════════════════════════════════════════════════════════════════
// G271 — SPEKTRUM-FARKINDA AĞIRLIKLANDIRMA (OLCUM-KESIM-17-08.md'nin bulgusu:
// yukarıdaki estimateChainGainDb'nin log-uniform frekans örneklemesi pembe
// gürültü VARSAYIYOR — bas-ağırlıklı GERÇEK kaynaklarda bu varsayım çöküyor,
// highpass GERÇEKTE sildiğinden ÇOK DAHA AZ telafi hesaplanıyor). DOKUNULAN
// TEK ŞEY ağırlıklandırma — biquadMagnitudeDb (RBJ matematiği, yukarıda)
// TEK SATIR değişmedi, estimateChainGainDb/compensationGainLinear DE
// değişmedi (fallback olarak AYNEN duruyor, sentetik kaynaklarda hâlâ
// kullanılıyor — bkz. audio-engine.js).
//
// YÖNTEM (OLCUM-KESIM-17-08.md madde D'de prototiplenip DOĞRULANDI —
// ortalama hata 16.08dB→3.42dB, groove.m4a'da her yerde <2.2dB): biquad
// filtreler DOĞRUSAL sistemler olduğu için GERÇEK ölçülen güç spektral
// yoğunluğu (S(f)) ile birleştirilebilir — pembe-gürültü VARSAYIMI yerine
// GERÇEK ÖLÇÜM. S(f) tahmini için YENİ bir FFT YAZILMADI — prototipteki
// "bant-geçiren filtre bankası" (BiquadFilterNode'un KENDİSİ bir spektral
// analiz aracı) burada SAF JS'te (audioCtx'siz, Node'da da çalışır —
// offline ön-hesaplama scripti bunu KULLANIYOR) YENİDEN üretildi — AYNI
// RBJ sabit-skirt-kazancı bant-geçiren formülü (cosW0/sinW0/alpha deseni
// biquadMagnitudeDb'nin KENDİSİYLE AYNI, SADECE b0/b1/b2 farklı), ama
// BiquadFilterNode ÜZERİNDEN DEĞİL doğrudan fark denklemi (IIR) olarak —
// gerçek ses render'ı YOK, matematiksel olarak DENK (Web Audio spesifikasyonu
// BiquadFilterNode'u BİREBİR bu formüllerle tanımlıyor).
const PSD_BANDPASS_Q = 1.4; // OLCUM-KESIM-17-08.md'nin prototipiyle AYNI Q

// SAF FONKSİYON: samples (Float32Array/Number[] PCM, TEK kanal) üzerinde
// TEK bir bant-geçiren (constant 0dB peak gain, RBJ Audio-EQ Cookbook)
// IIR filtresi uygulayıp çıkışın ORTALAMA GÜCÜNÜ (RMS²) döner — filtrelenmiş
// diziyi SAKLAMAZ (bellek), sadece toplam kareyi biriktirir.
export function bandpassPower(samples, sampleRate, centerFreq, Q = PSD_BANDPASS_Q) {
  if (!samples || !samples.length || !(sampleRate > 0) || !(centerFreq > 0)) return 0;
  const w0 = (2 * Math.PI * centerFreq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Math.max(Q, 1e-6));
  // RBJ "BPF, constant 0 dB peak gain": b0=alpha, b1=0, b2=-alpha, a0=1+alpha, a1=-2cosW0, a2=1-alpha.
  const a0 = 1 + alpha;
  const B0 = alpha / a0, B2 = -alpha / a0;
  const A1 = (-2 * cosW0) / a0, A2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = B0 * x0 + B2 * x2 - A1 * y1 - A2 * y2;
    sumSq += y0 * y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return sumSq / samples.length;
}

// SAF FONKSİYON: kaynağın 20Hz-Nyquist arasını `points` log-uniform merkez
// frekansında tarayıp HER birinin (bandpassPower ile) ortalama gücünü
// döner — bir kaynağın GERÇEK güç spektral yoğunluğunun (PSD) kaba ama
// GERÇEK-ÖLÇÜLMÜŞ bir tahmini. `{freqs, powers}` — powers ORAN olarak
// kullanılacağı için NORMALİZE EDİLMEMİŞ (mutlak ölçek önemsiz, bkz.
// estimateChainGainDbWeighted'in ORANLA çalışması).
export function computeSourcePsd(samples, sampleRate, points = 48) {
  const fMax = Math.min(20000, sampleRate / 2 - 100);
  const fMin = 20;
  const logMin = Math.log(fMin), logMax = Math.log(fMax);
  const freqs = new Array(points), powers = new Array(points);
  for (let i = 0; i < points; i++) {
    const t = points === 1 ? 0 : i / (points - 1);
    const f = Math.exp(logMin + (logMax - logMin) * t);
    freqs[i] = f;
    powers[i] = bandpassPower(samples, sampleRate, f);
  }
  return { freqs, powers };
}

// SAF FONKSİYON: estimateChainGainDb'nin AYNI matematiği (biquadMagnitudeDb
// TEK SATIR değişmeden yeniden kullanılıyor, kaskad dB toplama + güce
// çevirip ortalama alma AYNI) — SADECE ağırlıklandırma log-uniform
// (pembe gürültü varsayımı) YERİNE psd.powers (GERÇEK ölçülen enerji).
// psd GEÇERSİZ/eksikse null döner — çağıran taraf (audio-engine.js) BUNU
// "PSD yok, eskiye (estimateChainGainDb) düş" sinyali olarak kullanır.
export function estimateChainGainDbWeighted(filterParamsList, psd, { sampleRate } = {}) {
  if (!filterParamsList || !filterParamsList.length) return null;
  if (!psd || !Array.isArray(psd.freqs) || !psd.freqs.length || !Array.isArray(psd.powers)) return null;
  if (!(sampleRate > 0)) return null;
  let sumWeightedPower = 0, sumPower = 0;
  for (let i = 0; i < psd.freqs.length; i++) {
    const f = psd.freqs[i];
    const w = psd.powers[i];
    if (!(w > 0)) continue;
    let totalDb = 0;
    for (const params of filterParamsList) totalDb += biquadMagnitudeDb(params, f, sampleRate);
    sumWeightedPower += w * Math.pow(10, totalDb / 10);
    sumPower += w;
  }
  if (sumPower <= 0) return null;
  return 10 * Math.log10(sumWeightedPower / sumPower);
}

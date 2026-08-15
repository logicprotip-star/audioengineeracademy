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

// G101 — "Tonal Balance" kartının hesaplama çekirdeği. YENİ, sıfırdan yazıldı
// (task'ın kendi notu: "Bu kartın arkasındaki mantık sıfırdan yazılacak").
//
// DÜRÜSTLÜK NOTU — "analysis.js'in spektrumu" YOK: task metni "Veri
// analysis.js'in spektrumundan gelecek" diyordu, ama core/analysis.js
// (G98-G100) SADECE loudness/peak/RMS hesaplıyor — hiçbir bant/spektrum
// verisi ÜRETMİYOR (ITU-R BS.1770-4/EBU R128 kapsamı bunu gerektirmiyor).
// analysis.js'e DOKUNULMAMASI gerektiği için (task'ın kendi KURAL'ı) spektral
// ölçüm BURADA, TAMAMEN AYRI bir modülde, standart Web Audio AnalyserNode
// (tarayıcının kendi FFT'si — audio-engine.js'in oyun ekranında zaten
// kullandığı AYNI API, burada YENİDEN İCAT EDİLMEDİ) + OfflineAudioContext
// ile GERÇEK ölçüm olarak uygulandı. Yüklenen dosyanın TAMAMI, aralıklı
// örneklerle (hopSec) offline render edilip her örnekte spektrum okunuyor,
// FA_ZONES'un (frekans-bulma.js — Frekans Bulma modunun ZATEN kullandığı 6
// bölge, burada TEKRAR TANIMLANMADI) her bandına düşen bin'ler ortalanıyor.
//
// HEDEF EĞRİLER (Pop/EDM/Akustik) — G223 DÜZELTMESİ: eski DÜRÜSTLÜK NOTU
// ("bu sayılar ölçülmedi, tasarım dosyasından kopyalandı, TASLAK'tır")
// ARTIK GEÇERSİZ — sayılar 41 gerçek parçadan (Pop 25 · EDM 7 · Akustik 9)
// GERÇEKTEN ölçülerek türetildi. Yöntem: bu dosyanın KENDİ algoritması
// (measureSpectralDeviation + normalizeBandSums, aşağıda) birebir yeniden
// uygulanarak — fftSize 8192, tarayıcının AnalyserNode'unun kendi (spec'e
// göre Blackman) penceresi, hopSec 0.5s (t=0.5s'den dosya sonuna, son
// <0.5s'lik kuyruk hariç), sessizlik eşiği/atlama YOK, (L+R)/2 downmix
// (1-kanallı OfflineAudioContext'in varsayılan indirgemesi), her bin'in
// gücü kendi frekansıyla ağırlıklandırılıp (pembe-eğim telafisi) bant içi
// güç-domeninde ortalanıyor, bantlar arası normalize dB-domeninde 6 bandın
// aritmetik ortalamasına göre yapılıyor — kullanıcı tarafından ölçüldü,
// Claude bu ölçümü BAĞIMSIZ doğrulamadı (kaynak parça sesleri/ölçüm script'i
// bu oturumda incelenmedi).
// Ayırt edici bant ALT-ORTA (250-500 Hz): Pop +3.4 · EDM -0.2 · Akustik
// +5.4 — kategori İÇİ sapma 1.2-1.8dB, kategoriler ARASI fark 3.6-5.6dB.
// EDM'nin 7 parçası club-odaklı (tech house/big room/D&B); melodic/
// progressive EDM (Levels, Innerbloom, Summer, Titanium, adore u, Animals,
// Piece Of Your Heart) ölçümde Pop'tan ayrışmadığı için Pop kategorisine
// dahil edildi — liste ileride zenginleşebilir, bkz. DURUM.md G223.

import { FA_ZONES } from "../modes/frekans-bulma.js";
import { DEV_MODE } from "./build-flags.js";

export const BANDS = FA_ZONES.map((z) => z.t.split(" (")[0]);
export const BAND_EDGES = [FA_ZONES[0].a, ...FA_ZONES.map((z) => z.b)];

// Hedef eğriler (G223'ten beri GERÇEK ölçüm, ADI hâlâ DRAFT_TARGET_CURVES —
// kullanıcı kararı: mevcut çağrı noktaları/testler bu isme bağlı, isim
// DEĞİŞTİRİLMEDİ). Her dizi 6 bant için dB sapma (SUB/BAS/ALT-ORTA/ORTA/
// ÜST-ORTA/TİZ sırasıyla) — yöntem yukarıdaki DÜRÜSTLÜK NOTU'nda.
export const DRAFT_TARGET_CURVES = {
  Pop: [5.6, 3.2, 3.4, 1.3, -4.2, -9.4],
  EDM: [6.5, 2.4, -0.2, 1.4, -3.3, -6.8],
  Akustik: [4.0, 4.8, 5.4, 1.5, -4.9, -10.9],
};

export const OFF_TARGET_THRESHOLD_DB = 1.5;

// SAF — offline (dosya geneli) ve canlı (tek kare) ölçümün İKİSİNİN de
// paylaştığı bant biriktirme/normalize mantığı. Böylece iki yol da AYNI
// "band ortalama enerji − dosya/kare geneli ortalama enerji" tanımını
// kullanır, birbirinden sessizce sapmaz.
//
// G103 — KÖK SEBEP DÜZELTMESİ (canlı cihaz testinde bulundu): eskiden bant
// içindeki bin'lerin dB DEĞERLERİ doğrudan aritmetik ortalanıyordu. dB
// LOGARİTMİK bir ölçek — dB'leri doğrudan ortalamak, o bandın GERÇEK
// enerjisini DEĞİL, "kaç tane bin var" sayısını ölçer: BAND_EDGES logaritmik
// aralıklı olduğu için TİZ/ÜST-ORTA bandı SUB'dan YÜZLERCE kat fazla bin
// içeriyor (sabit binHz, geniş Hz aralığı) — bu bantlardaki çok sayıda
// neredeyse-sessiz bin, aritmetik ortalamayı GERÇEK algılanan seviyeden çok
// daha aşağı çekiyor (SUB'da tam tersi — az sayıda, sürekli dolu bin daha
// yüksek okunuyor). Sonuç: gerçek bir mix'te bile SUB/BAS/ALT-ORTA hep
// "fazla yüksek", ÜST-ORTA/TİZ hep "fazla düşük" çıkıyordu (±20dB'ye varan
// sahte sapmalar) — bantlar arasında ORTAK bir referans seviyesi YOKTU.
// DÜZELTME: dB → LİNEER GÜÇ'e çevrilip (10^(db/10)) güç DOMAİNİNDE
// ortalanıyor, sonra bandın ortalama gücü TEKRAR dB'ye çevriliyor
// (10*log10(avgPower)) — bu, RMS/enerji-tabanlı doğru bant ortalaması
// (birkaç yüksek-enerjili bin baskın olur, çok sayıda sessiz bin GERÇEK
// enerjiye ORANTILI şekilde az ağırlık taşır — dB'nin logaritmik "mesafe"
// eşitliğinin AKSİNE). -Infinity (tam sessizlik) bin'leri artık AYRICA
// atlanmaya gerek kalmadan güvenle dahil edilebiliyor: 10^(-Infinity/10)=0,
// yani sıfır enerji katkısı — matematiksel olarak doğru davranış.
//
// G103 — İKİNCİ KÖK SEBEP (canlı testte pembe/geniş-bant referans dosyasıyla
// bulundu, güç-domeni düzeltmesi TEK BAŞINA yetmedi): sabit binHz'li DOĞRUSAL
// bir FFT'de, GERÇEKÇİ/geniş-bant bir sinyalin (pembe gürültüye yakın, çoğu
// gerçek mix GİBİ) bin başına gücü doğal olarak ~1/f ile düşer (pembe
// gürültünün TANIMI: oktav başına EŞİT enerji → doğrusal bin'de −3dB/oktav
// eğim). Bu YÜZDEN "iyi dengelenmiş" bir mix bile, hiçbir düzeltme
// yapılmadan, SUB'da hep yüksek TİZ'de hep düşük ölçülür — bu bir ÖLÇÜM
// HATASI değil ama DRAFT_TARGET_CURVES'un ("taslak" hedefler, KÜÇÜK ±birkaç
// dB'lik sayılar) varsaydığı "düz/dengeli bir mix ~0 civarında ölçülür"
// KURALIYLA ÇELİŞİYOR. DÜZELTME: her bin'in gücü kendi frekansıyla
// ÇARPILARAK (`power * freq`) bant toplamına ekleniyor — pembe gürültü için
// power(f)∝1/f olduğundan power(f)×f≈SABİT, yani doğal −3dB/oktav eğim
// TAM OLARAK iptal oluyor (standart "pembe-ağırlıklı"/PSD-normalize analiz
// yöntemi — profesyonel spektrum analizörlerinin "RTA/pink" modlarının aynı
// ilkesi). Sonuç: pembe/geniş-bant bir referans artık tüm bantlarda ~0dB'ye
// yakın ölçülüyor (Kabul kriteri: ±6dB altında), GERÇEK bir dengesizlik
// (ör. bas-ağır bir mix) hâlâ doğru yönde ve büyüklükte sapma gösteriyor.
function bandIndexForFreq(freq) {
  if (freq < BAND_EDGES[0] || freq >= BAND_EDGES[BAND_EDGES.length - 1]) return -1;
  for (let i = 0; i < BANDS.length; i++) {
    if (freq >= BAND_EDGES[i] && freq < BAND_EDGES[i + 1]) return i;
  }
  return -1;
}
function dbToPower(db) {
  if (!Number.isFinite(db)) return db === -Infinity ? 0 : NaN;
  return Math.pow(10, db / 10);
}
function accumulateFreqSnapshot(freqData, binHz, bandPowerSum, bandCount) {
  for (let bin = 1; bin < freqData.length; bin++) {
    const freq = bin * binHz;
    const bandIdx = bandIndexForFreq(freq);
    if (bandIdx < 0) continue;
    const power = dbToPower(freqData[bin]);
    if (!Number.isFinite(power)) continue;
    bandPowerSum[bandIdx] += power * freq; // pembe-eğim telafisi, bkz. yukarıdaki not
    bandCount[bandIdx]++;
  }
}
function normalizeBandSums(bandPowerSum, bandCount) {
  const bandAvgDb = bandPowerSum.map((sum, i) => {
    if (bandCount[i] === 0) return null;
    const avgPower = sum / bandCount[i];
    return avgPower > 0 ? 10 * Math.log10(avgPower) : null;
  });
  const finiteAvgs = bandAvgDb.filter((v) => v !== null);
  if (finiteAvgs.length === 0) return BANDS.map(() => 0);
  const overallAvg = finiteAvgs.reduce((a, b) => a + b, 0) / finiteAvgs.length;
  return bandAvgDb.map((v) => (v === null ? 0 : v - overallAvg));
}

// SAF. TEK bir AnalyserNode karesini (getFloatFrequencyData çıktısı) 6-bant
// öz-ortalamaya-göre-sapma temsiline çevirir — measureSpectralDeviation ile
// AYNI iç mantık, tek fark dosya genelinde biriktirmek yerine TEK bir canlı
// kareyi normalize etmesi. Oyun ekranındaki "canlı analizör" hiç GÖSTERİLMEZ
// (cevabı ele verir); burada gizlenecek bir cevap yok — kullanıcının kendi
// dosyası, task'ın kendi gerekçesi.
export function bandDevsFromLiveSnapshot(freqData, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  const bandPowerSum = new Array(BANDS.length).fill(0);
  const bandCount = new Array(BANDS.length).fill(0);
  accumulateFreqSnapshot(freqData, binHz, bandPowerSum, bandCount);
  return normalizeBandSums(bandPowerSum, bandCount);
}

// SAF-E YAKIN (Web Audio gerektirir, ama DOM'a dokunmaz — sadece OfflineAudioContext).
// audioBuffer: gerçek bir AudioBuffer (upload.js'in decode ettiği). Dönen:
// 6 elemanlı dizi, her biri o bandın dosyanın KENDİ ortalamasına göre dB
// sapması (band ortalama enerji − dosya geneli ortalama enerji).
// G108 — "copyFile sonrası donma, hiç log yok" teşhisi için EKLENDİ (task'ın
// kendi kuralı: SADECE günlük, düzeltme YOK). Bu fonksiyon G106'dan beri
// GÜÇLÜ bir şüpheli: iOS Safari/WKWebView'in OfflineAudioContext suspend()/
// resume() zincirlemesinde iyi belgelenmiş güvenilirlik sorunları var — bu
// döngü BAŞARISIZ OLURSA (hata FIRLATMADAN sonsuza kadar askıda kalırsa) hiç
// log/hata görünmez, "sessiz donma" ile TAM örtüşür. `[upload-diag]` önekli,
// aynı app.js'teki desen — geçici, kök sebep bulununca kaldırılması BEKLENİR.
function tonalDiagMem() {
  if (typeof performance !== "undefined" && performance.memory) {
    const m = performance.memory;
    return ` | bellek: ${(m.usedJSHeapSize / 1048576).toFixed(1)}/${(m.jsHeapSizeLimit / 1048576).toFixed(1)} MB`;
  }
  return "";
}
// G239 — build-flags.js:DEV_MODE false iken (Release Archive) HİÇ basılmaz.
function tonalDiagLog(label, phase, detail) {
  if (!DEV_MODE) return;
  console.log(`[upload-diag] 5a) ${label} ${phase}${detail ? ` — ${detail}` : ""}${tonalDiagMem()}`);
}

export async function measureSpectralDeviation(audioBuffer, options = {}) {
  const fftSize = options.fftSize || 8192;
  const hopSec = options.hopSec || 0.5;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx) throw new Error("Bu tarayıcı OfflineAudioContext desteklemiyor — Tonal Balance ölçülemedi.");

  const duration = audioBuffer.duration;
  const expectedHops = Math.max(0, Math.ceil(duration / hopSec) - 1);
  const tSetup0 = performance.now();
  tonalDiagLog("OfflineAudioContext kurulumu", "BAŞLIYOR", `${duration.toFixed(1)}s, beklenen hop sayısı ~${expectedHops}`);
  const ctx = new OfflineCtx(1, Math.max(1, audioBuffer.length), audioBuffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  source.start();
  tonalDiagLog("OfflineAudioContext kurulumu", "BİTTİ", `${(performance.now() - tSetup0).toFixed(0)} ms`);

  const freqData = new Float32Array(analyser.frequencyBinCount);
  const binHz = ctx.sampleRate / fftSize;
  const bandPowerSum = new Array(BANDS.length).fill(0);
  const bandCount = new Array(BANDS.length).fill(0);

  let t = hopSec;
  let hopIndex = 0;
  const tLoop0 = performance.now();

  function sampleOnce() {
    analyser.getFloatFrequencyData(freqData);
    accumulateFreqSnapshot(freqData, binHz, bandPowerSum, bandCount);
  }

  tonalDiagLog("suspend/resume döngüsü (ana şüpheli — WKWebView'da bilinen güvenilirlik sorunu)", "BAŞLIYOR");
  await new Promise((resolve, reject) => {
    function scheduleNext() {
      if (t >= duration) {
        tonalDiagLog("suspend/resume döngüsü", "BİTTİ", `${hopIndex} hop, ${(performance.now() - tLoop0).toFixed(0)} ms`);
        resolve();
        return;
      }
      ctx.suspend(t).then(() => {
        hopIndex++;
        // Her hop DEĞİL — dosya uzunsa yüzlerce satır olurdu. İlk 3 + her
        // 10'da bir + SONUNCUDAN ÖNCEKİ (freeze'in TAM hangi hop'ta kaldığını
        // görmek için — bir SONRAKİ hop hiç loglanmazsa kök sebep BURADA).
        if (hopIndex <= 3 || hopIndex % 10 === 0) {
          tonalDiagLog("suspend/resume döngüsü", "hop", `#${hopIndex}/${expectedHops}, t=${t.toFixed(1)}s, ${(performance.now() - tLoop0).toFixed(0)} ms geçti`);
        }
        sampleOnce();
        t += hopSec;
        scheduleNext();
        ctx.resume();
      }).catch((err) => {
        tonalDiagLog("suspend/resume döngüsü", "HATA", `hop #${hopIndex}, t=${t.toFixed(1)}s — ${err && err.message}`);
        reject(err);
      });
    }
    scheduleNext();
    const tRender0 = performance.now();
    tonalDiagLog("ctx.startRendering()", "BAŞLIYOR");
    ctx.startRendering().then(() => {
      tonalDiagLog("ctx.startRendering()", "BİTTİ (render tamamlandı)", `${(performance.now() - tRender0).toFixed(0)} ms`);
    }).catch(reject);
  });
  // Son bir örnek (kuyruk) — dosyanın en son anını da yakala.
  // (startRendering tamamlandığında render bitmiştir, ek suspend gerekmez.)

  return normalizeBandSums(bandPowerSum, bandCount);
}

// SAF. devs: 6 elemanlı sapma dizisi (dB). Hedef dışı bantları ve genel
// "hedefte mi" durumunu döndürür.
export function summarizeDeviation(devs, threshold = OFF_TARGET_THRESHOLD_DB) {
  const offBands = BANDS.map((name, i) => ({ name, dev: devs[i] })).filter((b) => Math.abs(b.dev) > threshold);
  return { offBands, allWithinTarget: offBands.length === 0 };
}

// G127 — "Kendi referansım" (G157'de yayına açıldı) için SAF yardımcılar.
// Ses/DOM'a dokunmuyorlar — testler doğrudan bunlara dayanır.

// Her bandın TEK bir temsilci Hz'i — frekans-bulma.js'in kendi focusIdForZone
// mantığıyla AYNI (geometrik ortalama, log-ölçekte orta nokta): FA_ZONES'ta
// ayrı bir "merkez" alanı YOK, burada TEKRAR İCAT EDİLMEDİ, aynı formül.
export function bandCenterFreqs() {
  return BAND_EDGES.slice(0, -1).map((lo, i) => Math.sqrt(lo * BAND_EDGES[i + 1]));
}

// "Referans eğrisiyle dinle" (madde 5) — kendi mixin, referansın eğrisine göre
// işlenmiş HALDE duyulur: her bantta uygulanacak peaking-EQ kazancı, o bandın
// referans-mix FARKI kadardır (mix o bandı REF'ten NE KADAR azsa o kadar
// yükseltilir, fazlaysa o kadar kısılır) — uygulanınca mixDevs, refDevs'e
// yaklaşır (bkz. app.js'teki offline render testi, sayısal kanıt).
export function computeReferenceEqGainsDb(mixDevs, refDevs) {
  return mixDevs.map((d, i) => refDevs[i] - d);
}

// A/B dinleme (madde 4) — "İKİSİ AYNI seviyede çalsın": kaynağın kazancı,
// hedef LUFS'a ULAŞMASI için gereken dB kadar (targetLufs - sourceLufs).
export function lufsMatchGainDb(sourceLufs, targetLufs) {
  return targetLufs - sourceLufs;
}

export function dbToLinearGain(db) {
  return Math.pow(10, db / 20);
}

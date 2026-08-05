// Ses zinciri kurulumu ve yönetimi: AudioContext/analyser/masterGain/muteGain,
// kaynak üretimi (gürültü/synth/örnek dosya), mute/unmute (A/B bypass), stopAudio.
// Bir modun filtre/EQ zincirini nasıl kurduğunu BİLMEZ — bunun için applyProcessing
// callback'i alır (bkz. modes/*.js: applyProcessing(question, { audioCtx })).

import { findSource } from "./source-catalog.js";

const MUTE_RAMP_SEC = 0.05; // ~50ms — Durdur/Tekrar Çal arasındaki geçiş
// G33: stopAudio()'nun eski zincir söndürme zaman sabiti (0.03) node.stop()'un
// sabit gecikmesine (0.08sn) göre GEVŞEKTİ — setTargetAtTime asimptotik
// olduğu için 80ms'de gain hâlâ ~%7 seviyesindeydi, sonra node.stop() bunu
// SERT kesiyordu — bu, ZİNCİRİN HER YENİDEN KURULUŞUNDA (buildQuestionChain
// HER ÇAĞRILDIĞINDA) duyulabilir bir tıklama riski taşıyordu. Diğer beş modda
// bu SEYREK tetiklenir (tur başına bir kez) ama Kompresör'ün A/B/C döngüsü
// (her ~2sn'de) VE önizleme butonu HER basışta buildQuestionChain'i YENİDEN
// çağırıyor — aynı gevşek söndürme, Kompresör'de ÇOK daha sık duyulur hale
// geliyordu ("ses/kaynak değişince kesiklik" — kullanıcı raporu). Zaman
// sabiti sıkılaştırıldı (0.03→0.012) — .stop() ateşlendiğinde gain artık
// ~%0.1'e inmiş oluyor (pratikte sessiz), .stop()'un KENDİ zamanlaması
// (now+0.08) DEĞİŞMEDİ — hiçbir modun round geçiş SÜRESİ etkilenmiyor,
// sadece söndürme EĞRİSİ daha SIKI.
const STOP_RAMP_TIME_CONSTANT = 0.012;

export function createAudioEngine() {
  let audioCtx = null;
  let analyser = null;
  let masterGain = null;
  let muteGain = null;
  let audioReady = false;
  let audioUnlocked = false;
  let currentNodes = [];
  let onReady = null; // audioReady olduğunda bir kere çağrılır (ör. drawVisualizer'ı başlatmak için)
  // A/B kuru/işlenmiş crossfade gain'leri (bkz. buildQuestionChain/setProcessed) — bir
  // sonraki buildQuestionChain çağrısına kadar geçerli, o an aktif zincire ait.
  let dryGain = null;
  let wetGain = null;
  // G12: "upload" kaynağı aktifken buildQuestionChain'in geçirdiği uploadManager
  // referansı — SADECE stopAudio()'nun onu duraklatabilmesi için tutuluyor (bkz.
  // stopAudio). Kaynak upload DEĞİLSE null'a çekilir; böylece stopAudio() gömülü/
  // sentetik kaynaklarda hiçbir şey yapmaz (davranışları BOZULMAZ).
  let activeUploadManager = null;

  function unlockAudio() {
    // Mobil (özellikle iOS) için: ilk kullanıcı dokunuşunda context'i aç,
    // sessiz bir buffer çalıp kilidini aç, resume et.
    if (!audioReady) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      // Varsayılan .8 çok yumuşatıyor (çubuklar pürüzsüz azalan bir eğri gibi
      // görünüyordu, "canlı" hissettirmiyordu) — düşürünce görsel tepki hızlanır.
      analyser.smoothingTimeConstant = 0.4;
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.82;
      // Kalıcı susturma node'u: "Durdur" artık hiçbir kaynağı/filtreyi durdurmuyor,
      // sadece bunu 0'a rampalıyor — ses arka planda kesintisiz akmaya devam ediyor,
      // "Tekrar Çal" da sadece bunu geri açıyor.
      muteGain = audioCtx.createGain();
      muteGain.gain.value = 1;
      muteGain.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
      audioReady = true;
      if (onReady) onReady();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    if (!audioUnlocked) {
      // sessiz 1 örneklik buffer — iOS kilidini kırar
      try {
        const b = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
        const s = audioCtx.createBufferSource();
        s.buffer = b; s.connect(audioCtx.destination); s.start(0);
        audioUnlocked = true;
      } catch (e) {}
    }
  }

  // İlk dokunuş/tıklamada sesi kilitten çıkar (bir kez)
  ["pointerdown", "touchend", "click", "keydown"].forEach(ev => {
    window.addEventListener(ev, unlockAudio, { once: false, passive: true });
  });

  async function initAudio() {
    unlockAudio();
    if (audioCtx && audioCtx.state === "suspended") {
      try { await audioCtx.resume(); } catch (e) {}
    }
  }

  // --- ses efektleri: doğru = ding, yanlış = buzz ---
  function sfxDing() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g); g.connect(audioCtx.destination);
      const s = t + i * 0.08;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.16, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      o.start(s); o.stop(s + 0.24);
    });
  }

  function sfxBuzz() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.28);
    o2.type = "square"; o2.frequency.setValueAtTime(100, t); o2.frequency.exponentialRampToValueAtTime(55, t + 0.28);
    o.connect(g); o2.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.start(t); o2.start(t); o.stop(t + 0.34); o2.stop(t + 0.34);
  }

  // "Durdur" — hiçbir kaynağı/node'u durdurmaz, sadece kalıcı çıkış gain'ini kısa
  // bir rampayla 0'a indirir.
  function muteOutput() {
    if (!audioCtx || !muteGain) return;
    const now = audioCtx.currentTime;
    muteGain.gain.cancelScheduledValues(now);
    muteGain.gain.setValueAtTime(muteGain.gain.value, now);
    muteGain.gain.linearRampToValueAtTime(0.0001, now + MUTE_RAMP_SEC);
  }

  function unmuteOutput() {
    if (!audioCtx || !muteGain) return;
    const now = audioCtx.currentTime;
    muteGain.gain.cancelScheduledValues(now);
    muteGain.gain.setValueAtTime(muteGain.gain.value, now);
    muteGain.gain.linearRampToValueAtTime(1, now + MUTE_RAMP_SEC);
  }

  function stopAudio() {
    if (!audioCtx) return;
    // G12: fiziksel durdurmayla AYNI anda upload'ın MANTIKSAL çalma konumunu da
    // duraklat — aksi halde AudioBufferSourceNode gerçekten susar ama uploadManager
    // hâlâ "çalıyor" sanıp bir sonraki getSourceNode() çağrısında geçen GERÇEK
    // (duvar saati) süreyi offset'e ekler; kullanıcı cevap verip geri bildirimde
    // kaldığı süre kadar şarkı "ileri sarılmış" gibi görünürdü (bkz. DURUM.md G12).
    if (activeUploadManager) activeUploadManager.pausePlayback();
    const now = audioCtx.currentTime;
    currentNodes.forEach(node => {
      try {
        if (node.gain && node.gain.cancelScheduledValues) {
          node.gain.cancelScheduledValues(now);
          node.gain.setTargetAtTime(0.0001, now, STOP_RAMP_TIME_CONSTANT);
        }
      } catch {}
      try {
        // MediaElementAudioSourceNode'un .stop() metodu yok — bu kendisini etkilemez,
        // sadece node.disconnect() ile filtre zincirinden ayrılır (element çalmaya devam eder).
        if (node.stop) node.stop(now + 0.08);
      } catch {}
      try {
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    currentNodes = [];
    dryGain = null;
    wetGain = null;
  }

  function buildNoiseSource(sourceType) {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (sourceType === "pink") {
        last = 0.985 * last + 0.015 * white;
        data[i] = last * 2.5;
      } else {
        data[i] = white * 0.7;
      }
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start();
    return [noise];
  }

  // ---- örnek (dosya) tabanlı kaynaklar — XMLHttpRequest(arraybuffer) + decodeAudioData +
  // AudioBufferSourceNode (sentetik kaynakların ZATEN kullandığı yol). İki ayrı sorun tek
  // tek çözüldü: (1) fetch() WKWebView'da yerel bundle dosyasını çekemiyordu ("HTTP 0") —
  // XMLHttpRequest (arraybuffer response) aynı işi yerel dosyalarda da görüyor, fetch()
  // KULLANILMIYOR. (2) HTMLAudioElement (bir önceki commit) HTTP 0'ı çözdü ama iOS'ta
  // kesik kesik çaldı ve loop noktasında tıklama/boşluk vardı — streaming/element tabanlı
  // çalma kısa ve hassas zamanlamalı döngüler için uygun değil. AudioBufferSourceNode
  // kusursuz loop + örnek-hassas zamanlama sağlıyor. Kaynaklar küçük (en büyüğü ~130 KB/
  // 5.6sn) — decodeAudioData burada RAM riski TAŞIMIYOR (upload.js'in BÜYÜK kullanıcı
  // dosyaları için bu yoldan kaçınmasıyla çelişmiyor, o farklı bir ölçek — bkz. upload.js
  // başındaki not). AudioBuffer path başına decode edilip CACHE'lenir (immutable, paylaşımı
  // güvenli) — ama her turda YİNE DE yeni bir AudioBufferSourceNode oluşturulur, "kalıcı
  // graf mutasyonu yok" kuralı bozulmaz (sentetik kaynaklarla aynı desen).
  const sampleBufferCache = new Map(); // path -> Promise<AudioBuffer>, decode SADECE BİR KEZ
  function loadSampleBuffer(path) {
    if (sampleBufferCache.has(path)) return sampleBufferCache.get(path);
    const promise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", path, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = () => {
        if (xhr.status !== 0 && xhr.status !== 200) {
          reject(new Error(`Örnek yüklenemedi: ${path} (HTTP ${xhr.status})`));
          return;
        }
        audioCtx.decodeAudioData(
          xhr.response,
          resolve,
          err => reject(err instanceof Error ? err : new Error(`Örnek decode edilemedi: ${path}`))
        );
      };
      xhr.onerror = () => reject(new Error(`Örnek yüklenemedi: ${path} (ağ hatası)`));
      xhr.send();
    });
    // Başarısız denemeyi cache'leme — bir sonraki seçimde yeniden denensin (ör. dosya
    // sonradan eklendi).
    promise.catch(() => sampleBufferCache.delete(path));
    sampleBufferCache.set(path, promise);
    return promise;
  }
  async function buildSampleSource(path) {
    const buffer = await loadSampleBuffer(path);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return [src];
  }

  function buildSynthSource(sourceType) {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    const g2 = audioCtx.createGain();

    osc1.type = sourceType;
    osc2.type = sourceType === "square" ? "triangle" : "sine";
    osc1.frequency.value = 110;
    osc2.frequency.value = 220;
    g1.gain.value = 0.52;
    g2.gain.value = 0.34;

    osc1.connect(g1);
    osc2.connect(g2);
    osc1.start();
    osc2.start();

    return { nodes: [osc1, osc2, g1, g2], outputs: [g1, g2] };
  }

  const CROSSFADE_SEC = 0.05; // ~50ms — MUTE_RAMP_SEC ile aynı, tıklamasız geçiş

  // question: mod tarafından üretilmiş soru nesnesi (createQuestion çıktısı).
  // processed: başlangıç durumu (true=işlenmiş/wet, false=temiz/dry) — filtre zinciri
  // ARTIK HER ZAMAN kuruluyor, sadece hangi yolun başlangıçta duyulur olduğunu belirliyor
  // (bkz. aşağıdaki dryGain/wetGain paralel yollar). A/B arasında geçiş artık BU
  // fonksiyonu tekrar çağırmıyor — setProcessed() ile SADECE gain crossfade yapılıyor,
  // kaynak/filtre grafiği bir kez kurulup tur boyunca hiç bozulmuyor.
  // uploadManager: upload.js'in döndürdüğü nesne (varsa) — "upload" kaynağı için HER
  // ÇAĞRIDA uploadManager.getSourceNode() ile TAZE bir AudioBufferSourceNode istenir
  // (gömülü örneklerle AYNI node tipi — bkz. G8, DURUM.md E1: iki farklı source-node
  // tipinin karışması iOS'ta ses motorunu kilitliyordu). Pozisyon upload.js içinde
  // elle takip edildiği için kaldığı yerden devam eder.
  // applyProcessing: aktif modun applyProcessing(question, { audioCtx }) fonksiyonu.
  async function buildQuestionChain(question, processed, sourceType, uploadManager, applyProcessing) {
    stopAudio(); // ÖNCEKİ zincirin (varsa) upload konumunu duraklatır — bkz. activeUploadManager notu
    // Bu turun kaynağı upload İSE stopAudio()'nun bir SONRAKİ çağrısı bunu duraklatabilsin
    // diye referans burada güncelleniyor; değilse null (gömülü/sentetik kaynaklarda
    // stopAudio() hiçbir şey yapmaz).
    activeUploadManager = sourceType === "upload" ? uploadManager : null;

    // Güvenlik: bir önceki durum (Durdur) muteGain'i 0'da bırakmış olabilir; yeni bir
    // soru/round zinciri kuruluyorsa duyulabilir olmalı.
    if (muteGain) {
      const now = audioCtx.currentTime;
      muteGain.gain.cancelScheduledValues(now);
      muteGain.gain.setValueAtTime(1, now);
    }

    const out = audioCtx.createGain();
    out.gain.value = 0.0001;
    out.gain.exponentialRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);

    const sourceMix = audioCtx.createGain();
    sourceMix.gain.value = 1;

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 22;
    compressor.ratio.value = 2.2;

    // Filtreler artık KOŞULSUZ kuruluyor (processed=false'ta bile) — wet yol her zaman
    // hazır bekliyor, A/B toggle'ı sadece gain crossfade ile arasında geçiyor.
    const filters = applyProcessing(question, { audioCtx }).filters || [];

    const localDryGain = audioCtx.createGain();
    const localWetGain = audioCtx.createGain();
    localDryGain.gain.value = processed ? 0.0001 : 1;
    localWetGain.gain.value = processed ? 1 : 0.0001;
    dryGain = localDryGain;
    wetGain = localWetGain;

    currentNodes.push(out, sourceMix, compressor, localDryGain, localWetGain, ...filters);

    if (sourceType === "upload" && uploadManager && uploadManager.hasBuffer) {
      const node = uploadManager.getSourceNode();
      if (node) {
        node.connect(sourceMix);
        currentNodes.push(node);
      }
    } else if (sourceType === "pink" || sourceType === "white") {
      const [noise] = buildNoiseSource(sourceType);
      noise.connect(sourceMix);
      currentNodes.push(noise);
    } else if (findSource(sourceType)?.kind === "sample") {
      const samplePath = findSource(sourceType).samplePath;
      try {
        const [sample] = await buildSampleSource(samplePath);
        // stopAudio() bu zincirin kurulumu sırasında (decode beklerken) başka bir
        // soru/tur başladıysa currentNodes'u zaten temizlemiş olabilir — o zaman bu
        // node'u YİNE DE bağlamak eski bir zinciri diriltir. Zincirin hâlâ güncel
        // olduğunu currentNodes referansı üzerinden doğrula.
        if (currentNodes.includes(out)) {
          sample.connect(sourceMix);
          currentNodes.push(sample);
        } else {
          sample.stop();
        }
      } catch (err) {
        console.error(err);
        const [noise] = buildNoiseSource("pink");
        noise.connect(sourceMix);
        currentNodes.push(noise);
      }
    } else {
      const { nodes, outputs } = buildSynthSource(sourceType);
      outputs.forEach(o => o.connect(sourceMix));
      currentNodes.push(...nodes);
    }

    // Yalnızca örnek-dosya dalında gerçek bir await gecikmesi var — o sırada
    // stopAudio() başka bir tur tarafından çağrılmış olabilir. Böyle bir durumda bu
    // zincirin geri kalanını (filtre/compressor/muteGain bağlantısı) KURMA, yoksa
    // eski/öksüz bir zincir sessizce arka planda çalmaya başlar.
    if (!currentNodes.includes(out)) return;

    // Paralel kuru/işlenmiş yollar — İKİSİ DE her zaman bağlı, aralarında SADECE
    // localDryGain/localWetGain'in değeri (0.0001 ↔ 1) geçiş yapıyor. setProcessed()
    // bu ikisini crossfade eder; kaynak (sourceMix) veya filtreler bir daha ASLA
    // disconnect/reconnect edilmez.
    sourceMix.connect(localDryGain);
    localDryGain.connect(compressor);

    let wetNode = sourceMix;
    filters.forEach(f => { wetNode.connect(f); wetNode = f; });
    wetNode.connect(localWetGain);
    localWetGain.connect(compressor);

    compressor.connect(out);
    out.connect(muteGain);
  }

  // A/B toggle — ARTIK grafiği yeniden kurmuyor, sadece dryGain/wetGain arasında kısa
  // bir crossfade yapıyor. Kaynak (özellikle canlı çalan MediaElementAudioSourceNode)
  // hiç dokunulmadan çalmaya devam ediyor.
  function setProcessed(processed) {
    if (!audioCtx || !dryGain || !wetGain) return;
    const now = audioCtx.currentTime;
    const [d, w] = processed ? [0.0001, 1] : [1, 0.0001];
    dryGain.gain.cancelScheduledValues(now);
    dryGain.gain.setValueAtTime(dryGain.gain.value, now);
    dryGain.gain.linearRampToValueAtTime(d, now + CROSSFADE_SEC);
    wetGain.gain.cancelScheduledValues(now);
    wetGain.gain.setValueAtTime(wetGain.gain.value, now);
    wetGain.gain.linearRampToValueAtTime(w, now + CROSSFADE_SEC);
  }

  return {
    unlockAudio,
    initAudio,
    sfxDing,
    sfxBuzz,
    muteOutput,
    unmuteOutput,
    stopAudio,
    buildQuestionChain,
    setProcessed,
    set onReady(fn) { onReady = fn; },
    get audioCtx() { return audioCtx; },
    get analyser() { return analyser; },
    get audioReady() { return audioReady; }
  };
}

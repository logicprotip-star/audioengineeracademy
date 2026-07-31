// Ses zinciri kurulumu ve yönetimi: AudioContext/analyser/masterGain/muteGain,
// kaynak üretimi (gürültü/synth), mute/unmute (A/B bypass), stopAudio. Bir modun
// filtre/EQ zincirini nasıl kurduğunu BİLMEZ — bunun için applyProcessing callback'i
// alır (bkz. modes/*.js: applyProcessing(question, { audioCtx })).

const MUTE_RAMP_SEC = 0.05; // ~50ms — Durdur/Tekrar Çal arasındaki geçiş

export function createAudioEngine() {
  let audioCtx = null;
  let analyser = null;
  let masterGain = null;
  let muteGain = null;
  let audioReady = false;
  let audioUnlocked = false;
  let currentNodes = [];
  let onReady = null; // audioReady olduğunda bir kere çağrılır (ör. drawVisualizer'ı başlatmak için)

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
    const now = audioCtx.currentTime;
    currentNodes.forEach(node => {
      try {
        if (node.gain && node.gain.cancelScheduledValues) {
          node.gain.cancelScheduledValues(now);
          node.gain.setTargetAtTime(0.0001, now, 0.03);
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

  // question: mod tarafından üretilmiş soru nesnesi (createQuestion çıktısı).
  // processed=false ise filtre zinciri hiç kurulmaz (A/B bypass — temiz referans sesi).
  // uploadedMediaSource: upload.js'in yönettiği kalıcı MediaElementAudioSourceNode (varsa).
  // applyProcessing: aktif modun applyProcessing(question, { audioCtx }) fonksiyonu.
  function buildQuestionChain(question, processed, sourceType, uploadedMediaSource, applyProcessing) {
    stopAudio();

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

    const filters = processed ? (applyProcessing(question, { audioCtx }).filters || []) : [];

    currentNodes.push(out, sourceMix, compressor, ...filters);

    if (sourceType === "upload" && uploadedMediaSource) {
      // Kalıcı node — burada YENİDEN oluşturulmuyor, sadece yeni filtre zincirine bağlanıyor.
      uploadedMediaSource.connect(sourceMix);
      currentNodes.push(uploadedMediaSource);
    } else if (sourceType === "pink" || sourceType === "white") {
      const [noise] = buildNoiseSource(sourceType);
      noise.connect(sourceMix);
      currentNodes.push(noise);
    } else {
      const { nodes, outputs } = buildSynthSource(sourceType);
      outputs.forEach(o => o.connect(sourceMix));
      currentNodes.push(...nodes);
    }

    if (processed) {
      let node = sourceMix;
      filters.forEach(f => { node.connect(f); node = f; });
      node.connect(compressor);
      compressor.connect(out);
    } else {
      sourceMix.connect(compressor);
      compressor.connect(out);
    }

    out.connect(muteGain);
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
    set onReady(fn) { onReady = fn; },
    get audioCtx() { return audioCtx; },
    get analyser() { return analyser; },
    get audioReady() { return audioReady; }
  };
}

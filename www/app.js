    (() => {
      const FILTERS = ["peaking", "highshelf", "lowshelf", "highpass", "lowpass", "notch"];
      const FILTER_LABELS = {
        peaking: "Bell",
        highshelf: "High Shelf",
        lowshelf: "Low Shelf",
        highpass: "High Pass",
        lowpass: "Low Pass",
        notch: "Notch"
      };

      const FREQ_RANGES = [
        { key: "sub", label: "Sub Bass", min: 30, max: 80 },
        { key: "bass", label: "Bass", min: 80, max: 220 },
        { key: "lowmid", label: "Low Mid", min: 220, max: 900 },
        { key: "presence", label: "Presence", min: 900, max: 4200 },
        { key: "air", label: "Air", min: 4200, max: 12000 }
      ];

      const INSTRUMENTS = [
        { key: "kick", label: "Kick / Thump", base: [45, 60, 90] },
        { key: "bass", label: "Bass / Warmth", base: [80, 110, 170] },
        { key: "guitar", label: "Guitar / Boxiness", base: [240, 700, 2400] },
        { key: "vocal", label: "Vocal / Presence", base: [220, 1200, 4200] },
        { key: "hihat", label: "Hi-Hat / Air", base: [5000, 8000, 11000] }
      ];

      const DIFFICULTY = {
        easy: { gain: 10, q: 0.9, xp: 16, options: 3, time: 16, lives: 5 },
        medium: { gain: 8, q: 1.3, xp: 24, options: 4, time: 13, lives: 4 },
        hard: { gain: 6, q: 2.5, xp: 36, options: 5, time: 11, lives: 3 },
        pro: { gain: 4.5, q: 4.2, xp: 52, options: 6, time: 9, lives: 3 }
      };

      const ACHIEVEMENTS = [
        { id: "first_blood", icon: "🎧", title: "İlk Kulak", desc: "İlk doğru cevabı ver.", check: s => s.correct >= 1 },
        { id: "combo_5", icon: "🔥", title: "Alev Zinciri", desc: "5 combo yap.", check: s => s.bestCombo >= 5 },
        { id: "combo_10", icon: "⚡", title: "Şimşek Kulak", desc: "10 combo yap.", check: s => s.bestCombo >= 10 },
        { id: "round_25", icon: "🏁", title: "Dayanıklılık", desc: "25 tur tamamla.", check: s => s.rounds >= 25 },
        { id: "round_100", icon: "🧠", title: "EQ Beyni", desc: "100 tur tamamla.", check: s => s.rounds >= 100 },
        { id: "accuracy_70", icon: "🎯", title: "Keskin Hedef", desc: "En az 20 turda %70 doğruluk yakala.", check: s => s.rounds >= 20 && accuracy(s) >= 70 },
        { id: "level_5", icon: "🚀", title: "Yükseliş", desc: "Level 5 ol.", check: s => levelFromXp(s.xp) >= 5 },
        { id: "pro_clear", icon: "👑", title: "Pro Kulak", desc: "Pro zorlukta 8 doğru yap.", check: s => s.proCorrect >= 8 },
        { id: "boss_win", icon: "💀", title: "Boss Avcısı", desc: "Bir boss round kazan.", check: s => s.bossWins >= 1 }
      ];

      const els = {
        startBtn: document.getElementById("startBtn"),
        nextBtn: document.getElementById("nextBtn"),
        playACleanBtn: document.getElementById("playACleanBtn"),
        playBFilteredBtn: document.getElementById("playBFilteredBtn"),
        abAutoBtn: document.getElementById("abAutoBtn"),
        replayBtn: document.getElementById("replayBtn"),
        hintBtn: document.getElementById("hintBtn"),
        toggleVisualizerBtn: document.getElementById("toggleVisualizerBtn"),
        resetStatsBtn: document.getElementById("resetStatsBtn"),
        modeSelect: document.getElementById("modeSelect"),
        difficultySelect: document.getElementById("difficultySelect"),
        playModeSelect: document.getElementById("playModeSelect"),
        sourceSelect: document.getElementById("sourceSelect"),
        audioFileInput: document.getElementById("audioFileInput"),
        questionTitle: document.getElementById("questionTitle"),
        questionMeta: document.getElementById("questionMeta"),
        answers: document.getElementById("answers"),
        feedbackBox: document.getElementById("feedbackBox"),
        feedbackDetail: document.getElementById("feedbackDetail"),
        roundChip: document.getElementById("roundChip"),
        scoreChip: document.getElementById("scoreChip"),
        bossChip: document.getElementById("bossChip"),
        comboValue: document.getElementById("comboValue"),
        xpValue: document.getElementById("xpValue"),
        levelValue: document.getElementById("levelValue"),
        accuracyValue: document.getElementById("accuracyValue"),
        xpBar: document.getElementById("xpBar"),
        progressText: document.getElementById("progressText"),
        roundsValue: document.getElementById("roundsValue"),
        correctValue: document.getElementById("correctValue"),
        wrongValue: document.getElementById("wrongValue"),
        avgScoreValue: document.getElementById("avgScoreValue"),
        bestComboValue: document.getElementById("bestComboValue"),
        bestScoreValue: document.getElementById("bestScoreValue"),
        streakText: document.getElementById("streakText"),
        achievementList: document.getElementById("achievementList"),
        historyList: document.getElementById("historyList"),
        hearts: document.getElementById("hearts"),
        timerText: document.getElementById("timerText"),
        timerBar: document.getElementById("timerBar"),
        dailyList: document.getElementById("dailyList"),
        canvas: document.getElementById("visualizer"),
        answersEl: document.getElementById("answers"),
        freqGuessArea: document.getElementById("freqGuessArea"),
        freqInfo: document.getElementById("freqInfo"),
        timerModeSelect: document.getElementById("timerModeSelect"),
        layerControl: document.getElementById("layerControl"),
        layerSelect: document.getElementById("layerSelect")
      };

      const ctx2d = els.canvas.getContext("2d");

      let audioCtx = null;
      let analyser = null;
      let masterGain = null;
      let audioReady = false;

      let currentNodes = [];
      let activeQuestion = null;
      let roundActive = false;
      let currentPlayMode = "filtered";
      let visualizerOn = true;

      let uploadedAudioBuffer = null;
      let currentUploadedSource = null;
      let uploadOffset = 0;        // yüklenen sesin kaldığı pozisyon (saniye)
      let uploadStartedAt = 0;     // bu kaynağın audioCtx zamanında başladığı an
      let timerInterval = null;
      let timeLeft = 0;
      let roundDuration = 0;
      let currentLives = 4;
      let abDemoLock = false;

      // --- Frekans modu: wave üzerine tıklayarak tahmin ---
      const FA_MIN = 20, FA_MAX = 20000;
      let freqGuessHz = null;   // kullanıcının cetvel üzerinde seçtiği Hz
      let freqHoverHz = null;   // fare/dokunuş anlık pozisyon
      const faXToF = (x, w) => FA_MIN * Math.pow(FA_MAX / FA_MIN, x / w);
      const faFToX = (f, w) => w * Math.log(f / FA_MIN) / Math.log(FA_MAX / FA_MIN);
      const FA_TICKS = [31,63,125,250,500,1000,2000,4000,8000,16000];

      // --- Native depolama (Capacitor Preferences) ile localStorage'ı yedekli tutma ---
      // WKWebView bazen depolama baskısı altında localStorage'ı temizleyebiliyor;
      // her yazımda sessizce Preferences'a da mirror atıp, açılışta eksikse oradan kurtarıyoruz.
      function getPrefs() {
        return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) || null;
      }
      function mirrorSet(key, value) {
        const p = getPrefs();
        if (p) p.set({ key, value }).catch(() => {});
      }
      function mirrorRemove(key) {
        const p = getPrefs();
        if (p) p.remove({ key }).catch(() => {});
      }

      // --- Bölge bazlı performans (zayıf bölge analizi için) ---
      let zoneStats = (function(){ try { return JSON.parse(localStorage.getItem("fa_zonestats")) || {}; } catch(e){ return {}; } })();
      function recordZone(freq, correct) {
        const z = FA_ZONES.find(zz => freq >= zz.a && freq < zz.b);
        if (!z) return;
        const key = z.t.split(" (")[0];
        zoneStats[key] = zoneStats[key] || { n: 0, ok: 0 };
        zoneStats[key].n++;
        if (correct) zoneStats[key].ok++;
        try {
          const raw = JSON.stringify(zoneStats);
          localStorage.setItem("fa_zonestats", raw);
          mirrorSet("fa_zonestats", raw);
        } catch(e){}
      }

      // Kişisel analiz: bölge bölge başarıyı okuyup güçlü/zayıf bölgeyi söyle
      function renderAnalysis() {
        const body = document.getElementById("analysisBody");
        if (!body) return;
        const entries = Object.entries(zoneStats).filter(([k, v]) => v.n >= 2);
        if (entries.length < 2) {
          const total = Object.values(zoneStats).reduce((s, v) => s + v.n, 0);
          body.innerHTML = total === 0
            ? `Birkaç tur oyna, kulağının hangi frekans bölgesinde güçlü/zayıf olduğunu burada göstereceğim.`
            : `Analiz için biraz daha veri topluyorum… (${total} deneme)`;
          return;
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
        body.innerHTML =
          `<div style="margin-bottom:8px">En zayıf bölgen <b style="color:var(--red)">${weak.k}</b> (%${weak.pct}). En güçlü: <b style="color:var(--green)">${strong.k}</b> (%${strong.pct}).</div>` +
          bars +
          `<div style="margin-top:9px;color:var(--cyan);font-size:12px">💡 Öneri: bir süre <b>${weak.k}</b> aralığına odaklan; A/B'yi bol kullanıp farkı yakala.</div>`;
      }

      // Frekans bölgesi bilgileri — cevap sonrası öğretici ipucu
      const FA_ZONES = [
        {a:20,b:120, t:"SUB (20–120 Hz)", tip:"Gövde ve güç. Kick ve bas burada yaşar. Yükseltince ağırlık/derinlik gelir; fazlası çamur ve boğukluk, azı cılızlık yapar."},
        {a:120,b:500, t:"BAS (120–500 Hz)", tip:"Doluluk ve sıcaklık. 200–400 Hz birikirse 'çamur' hissi verir; mix'te en çok kesilen bölge. Yükseltmek sesi kalınlaştırır, kesmek temizler."},
        {a:500,b:2000, t:"ORTA (500 Hz–2 kHz)", tip:"Enstrümanların gövdesi ve vokal netliği. 800 Hz–1 kHz fazlaysa 'kutu / telefon' sesi olur. Kesmek açar, yükseltmek öne çıkarır ama abartısı burun sesi yapar."},
        {a:2000,b:8000, t:"ÜST-ORTA (2–8 kHz)", tip:"Netlik, atak, sertlik. Kulağın en hassas bölgesi (2–4 kHz). Yükseltmek anlaşılırlık ve parlaklık katar; fazlası yorucu ve batıcı olur, tıslama artar."},
        {a:8000,b:20000, t:"TİZ / HAVA (8–20 kHz)", tip:"Parlaklık ve hava. Yükseltmek açıklık ve 'pahalı' his verir; azı boğuk, fazlası tiz ve cırtlak. Vokale hava burada eklenir."},
      ];
      const faZoneOf = f => FA_ZONES.find(z => f >= z.a && f < z.b) || FA_ZONES[FA_ZONES.length-1];

      let stats = loadStats();
      let history = stats.history || [];
      let daily = loadDaily();

      // localStorage boşsa (ör. WKWebView temizlemişse) Preferences'taki yedekten kurtar.
      (async function reconcileFromPreferences() {
        const p = getPrefs();
        if (!p) return;
        try {
          let recovered = false;
          if (!localStorage.getItem("eqEarTrainerProXStats")) {
            const { value } = await p.get({ key: "eqEarTrainerProXStats" });
            if (value) {
              localStorage.setItem("eqEarTrainerProXStats", value);
              stats = loadStats();
              history = stats.history || [];
              recovered = true;
            }
          }
          if (!localStorage.getItem("eqEarTrainerProXDaily")) {
            const { value } = await p.get({ key: "eqEarTrainerProXDaily" });
            if (value) {
              localStorage.setItem("eqEarTrainerProXDaily", value);
              daily = loadDaily();
              recovered = true;
            }
          }
          if (!localStorage.getItem("fa_zonestats")) {
            const { value } = await p.get({ key: "fa_zonestats" });
            if (value) {
              localStorage.setItem("fa_zonestats", value);
              zoneStats = JSON.parse(value);
              recovered = true;
            }
          }
          if (recovered) { updateUI(); renderHistory(); renderDaily(); renderAnalysis(); }
        } catch (e) {}
      })();

      function freshDiffState(lives) {
        return { xp: 0, score: 0, bestScore: 0, lives: lives };
      }
      function freshStats() {
        return {
          // ortak: combo, doğruluk, başarım, geçmiş
          rounds: 0,
          correct: 0,
          wrong: 0,
          combo: 0,
          bestCombo: 0,
          unlocked: [],
          proCorrect: 0,
          hintsUsed: 0,
          bossWins: 0,
          history: [],
          // her zorluk kendi puanı/xp/level/canı
          perDiff: {
            easy: freshDiffState(5),
            medium: freshDiffState(4),
            hard: freshDiffState(3),
            pro: freshDiffState(3)
          }
        };
      }

      // seçili zorluğun kendi durumu (xp/score/bestScore/lives)
      function diffState() {
        const key = els.difficultySelect ? els.difficultySelect.value : "medium";
        if (!stats.perDiff) stats.perDiff = freshStats().perDiff;
        if (!stats.perDiff[key]) stats.perDiff[key] = freshDiffState(DIFFICULTY[key].lives);
        return stats.perDiff[key];
      }

      function loadStats() {
        try {
          const raw = localStorage.getItem("eqEarTrainerProXStats");
          const s = raw ? JSON.parse(raw) : freshStats();
          if (!s.perDiff) s.perDiff = freshStats().perDiff;
          ["easy","medium","hard","pro"].forEach(k => {
            if (!s.perDiff[k]) s.perDiff[k] = freshDiffState(DIFFICULTY[k].lives);
          });
          return s;
        } catch {
          return freshStats();
        }
      }

      function saveStats() {
        stats.history = history.slice(0, 12);
        const raw = JSON.stringify(stats);
        localStorage.setItem("eqEarTrainerProXStats", raw);
        mirrorSet("eqEarTrainerProXStats", raw);
      }

      function dailyKey() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      }

      function freshDaily() {
        return {
          key: dailyKey(),
          tasks: [
            { id: "d1", title: "5 tur oyna", desc: "Bugün 5 tur tamamla.", target: 5, value: 0, reward: 40, claimed: false },
            { id: "d2", title: "3 doğru yap", desc: "Bugün 3 doğru cevap ver.", target: 3, value: 0, reward: 50, claimed: false },
            { id: "d3", title: "2 combo yap", desc: "En az 2’lik combo kur.", target: 2, value: 0, reward: 35, claimed: false }
          ]
        };
      }

      function loadDaily() {
        try {
          const raw = localStorage.getItem("eqEarTrainerProXDaily");
          if (!raw) return freshDaily();
          const parsed = JSON.parse(raw);
          if (parsed.key !== dailyKey()) return freshDaily();
          return parsed;
        } catch {
          return freshDaily();
        }
      }

      function saveDaily() {
        const raw = JSON.stringify(daily);
        localStorage.setItem("eqEarTrainerProXDaily", raw);
        mirrorSet("eqEarTrainerProXDaily", raw);
      }

      function accuracy(s = stats) {
        return s.rounds ? Math.round((s.correct / s.rounds) * 100) : 0;
      }

      function xpNeeded(level) {
        return 120 + (level - 1) * 70;
      }

      function levelFromXp(xp) {
        let level = 1;
        let spent = 0;
        while (xp >= spent + xpNeeded(level)) {
          spent += xpNeeded(level);
          level++;
        }
        return level;
      }

      function xpProgress(xp) {
        let level = 1;
        let spent = 0;
        while (xp >= spent + xpNeeded(level)) {
          spent += xpNeeded(level);
          level++;
        }
        return { level, current: xp - spent, required: xpNeeded(level) };
      }

      function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
      }

      function randomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
      }

      function logFreq(min, max) {
        const a = Math.log(min);
        const b = Math.log(max);
        return Math.exp(randomBetween(a, b));
      }

      function shuffle(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      }

      let audioUnlocked = false;
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
        // iki katmanlı, daha belirgin bir "yanlış" sesi
        const o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.28);
        o2.type = "square"; o2.frequency.setValueAtTime(100, t); o2.frequency.exponentialRampToValueAtTime(55, t + 0.28);
        o.connect(g); o2.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        o.start(t); o2.start(t); o.stop(t + 0.34); o2.stop(t + 0.34);
      }

      function unlockAudio() {
        // Mobil (özellikle iOS) için: ilk kullanıcı dokunuşunda context'i aç,
        // sessiz bir buffer çalıp kilidini aç, resume et.
        if (!audioReady) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          masterGain = audioCtx.createGain();
          masterGain.gain.value = 0.82;
          masterGain.connect(analyser);
          analyser.connect(audioCtx.destination);
          audioReady = true;
          drawVisualizer();
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

      function currentDifficulty() {
        return DIFFICULTY[els.difficultySelect.value];
      }

      function formatHz(v) {
        if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)} kHz`;
        return `${Math.round(v)} Hz`;
      }

      function labelSource(s) {
        return {
          pink: "Pink Noise",
          white: "White Noise",
          saw: "Saw Synth",
          square: "Square Synth",
          triangle: "Triangle Synth",
          upload: "Yüklenen Ses"
        }[s] || s;
      }

      function isBossRound() {
        return (stats.rounds + 1) % 5 === 0;
      }

      // Pro Plus için birbirinden ayrık 4 bant üret (frekanslar üst üste binmesin)
      function buildProPlusBands(count, gainAbs) {
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

      function buildQuestion() {
        const diff = currentDifficulty();
        const mode = els.modeSelect.value;
        const boss = isBossRound();

        // ---- PRO PLUS: katmana göre ----
        if (mode === "proplus") {
          const layer = parseInt(els.layerSelect.value, 10) || 1;
          const gainAbs = boss ? diff.gain * 0.85 : diff.gain;
          if (layer === 2) {
            // Katman 2: tek frekans, yerini + kaç dB tahmin et
            const sign = Math.random() > 0.5 ? 1 : -1;
            const dbChoices = [3, 6, 9, 12];
            const db = dbChoices[Math.floor(Math.random() * dbChoices.length)];
            return {
              mode, layer,
              difficulty: els.difficultySelect.value,
              freq: logFreq(80, 17000),
              gain: db * sign,
              gainDb: db,
              q: 3.0,
              source: els.sourceSelect.value, hintUsed: false, boss
            };
          }
          // Katman 1 ve 3: 4 bant karışık
          const bands = buildProPlusBands(4, Math.max(6, gainAbs));
          return {
            mode, layer,
            difficulty: els.difficultySelect.value,
            bands,
            guesses: [],          // K1: [hz], K3: [{hz, dir}]
            source: els.sourceSelect.value, hintUsed: false, boss
          };
        }

        // ---- FREKANS (tek bant) ----
        let freq = logFreq(80, 17000);
        const gainSign = Math.random() > 0.5 ? 1 : -1;
        const baseGain = boss ? diff.gain * 0.75 : diff.gain;
        const gain = baseGain * gainSign;
        const q = boss ? diff.q * 1.35 : diff.q;

        return {
          mode,
          difficulty: els.difficultySelect.value,
          filterType: "peaking",
          filterLabel: FILTER_LABELS["peaking"],
          freq,
          gain,
          q,
          source: els.sourceSelect.value,
          hintUsed: false,
          boss
        };
      }

      function modeDescription(q) {
        if (q.mode === "proplus") {
          const L = q.layer || 1;
          if (L === 2) return `A/B ile karşılaştır: tek frekansla oynandı. Yerini bul, sonra kaç dB (3/6/9/12) olduğunu tahmin et.`;
          if (L === 3) return `A/B ile karşılaştır: 4 frekans var. Her birinin hem yerini hem yönünü (açık/kısık) bul.`;
          return `A/B ile karşılaştır: 4 frekansla oynandı (kimi açık, kimi kısık). Dört noktayı da işaretle.`;
        }
        return `A/B ile karşılaştır, farkın en belirgin olduğu frekansı dalga üzerinde işaretle.`;
      }

      function ensureCorrectOption(options, correctValue, createCorrectOption) {
        if (!options.some(o => o.value === correctValue)) {
          if (options.length > 0) {
            options[Math.floor(Math.random() * options.length)] = createCorrectOption();
          } else {
            options.push(createCorrectOption());
          }
        }
        return shuffle(options);
      }

      function answerOptions(q) {
        const limit = currentDifficulty().options;

        if (q.mode === "filter") {
          const opts = shuffle(FILTERS.map(k => ({
            value: k,
            label: FILTER_LABELS[k],
            tiny: "Filtre Tipi"
          }))).slice(0, limit);

          return ensureCorrectOption(opts, q.filterType, () => ({
            value: q.filterType,
            label: q.filterLabel,
            tiny: "Filtre Tipi"
          }));
        }

        if (q.mode === "frequency") {
          const opts = shuffle(FREQ_RANGES.map(r => ({
            value: r.key,
            label: r.label,
            tiny: `${r.min}-${r.max} Hz`
          }))).slice(0, Math.min(limit, FREQ_RANGES.length));

          return ensureCorrectOption(opts, q.freqRange.key, () => ({
            value: q.freqRange.key,
            label: q.freqRange.label,
            tiny: `${q.freqRange.min}-${q.freqRange.max} Hz`
          }));
        }

        const opts = shuffle(INSTRUMENTS.map(i => ({
          value: i.key,
          label: i.label,
          tiny: "Instrument Mode"
        }))).slice(0, Math.min(limit, INSTRUMENTS.length));

        return ensureCorrectOption(opts, q.instrument.key, () => ({
          value: q.instrument.key,
          label: q.instrument.label,
          tiny: "Instrument Mode"
        }));
      }

      function stopAudio() {
        if (!audioCtx) return;

        // yüklenen ses çalıyorsa kaldığı pozisyonu sakla
        if (currentUploadedSource && uploadedAudioBuffer) {
          uploadOffset = (audioCtx.currentTime - uploadStartedAt) % uploadedAudioBuffer.duration;
          if (uploadOffset < 0) uploadOffset = 0;
        }

        const now = audioCtx.currentTime;
        currentNodes.forEach(node => {
          try {
            if (node.gain && node.gain.cancelScheduledValues) {
              node.gain.cancelScheduledValues(now);
              node.gain.setTargetAtTime(0.0001, now, 0.03);
            }
          } catch {}
          try {
            if (node.stop) node.stop(now + 0.08);
          } catch {}
          try {
            if (node.disconnect) node.disconnect();
          } catch {}
        });

        currentNodes = [];
        currentUploadedSource = null;
      }

      function buildQuestionChain(question, processed = true) {
        stopAudio();

        const out = audioCtx.createGain();
        out.gain.value = 0.0001;
        out.gain.exponentialRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);

        const sourceMix = audioCtx.createGain();
        sourceMix.gain.value = 1;

        // Filtre zinciri: Pro Plus K1/K3'te 4 bant; K2 ve tek-bant modunda 1 peaking
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

        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 22;
        compressor.ratio.value = 2.2;

        currentNodes.push(out, sourceMix, compressor, ...filters);

        if (question.source === "upload" && uploadedAudioBuffer) {
          const src = audioCtx.createBufferSource();
          src.buffer = uploadedAudioBuffer;
          src.loop = true;
          src.connect(sourceMix);
          // kaldığı yerden devam et (offset buffer süresine göre sarmalanır)
          const off = uploadOffset % uploadedAudioBuffer.duration;
          src.start(0, off);
          uploadStartedAt = audioCtx.currentTime - off;
          currentNodes.push(src);
          currentUploadedSource = src;
        } else if (question.source === "pink" || question.source === "white") {
          const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          let last = 0;

          for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            if (question.source === "pink") {
              last = 0.985 * last + 0.015 * white;
              data[i] = last * 2.5;
            } else {
              data[i] = white * 0.7;
            }
          }

          const noise = audioCtx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          noise.connect(sourceMix);
          noise.start();
          currentNodes.push(noise);
        } else {
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const g1 = audioCtx.createGain();
          const g2 = audioCtx.createGain();

          osc1.type = question.source;
          osc2.type = question.source === "square" ? "triangle" : "sine";
          osc1.frequency.value = 110;
          osc2.frequency.value = 220;
          g1.gain.value = 0.52;
          g2.gain.value = 0.34;

          osc1.connect(g1);
          osc2.connect(g2);
          g1.connect(sourceMix);
          g2.connect(sourceMix);
          osc1.start();
          osc2.start();

          currentNodes.push(osc1, osc2, g1, g2);
        }

        if (processed) {
          // sourceMix → filter1 → filter2 → ... → compressor → out
          let node = sourceMix;
          filters.forEach(f => { node.connect(f); node = f; });
          node.connect(compressor);
          compressor.connect(out);
        } else {
          sourceMix.connect(compressor);
          compressor.connect(out);
        }

        out.connect(masterGain);
      }

      function playQuestion(processed = true) {
        if (!audioReady || !activeQuestion) return;
        if (audioCtx && audioCtx.state === "suspended") { try { audioCtx.resume(); } catch (e) {} }
        currentPlayMode = processed ? "filtered" : "clean";
        buildQuestionChain(activeQuestion, processed);
      }

      async function playABDemo() {
        if (!activeQuestion || abDemoLock) return;
        abDemoLock = true;
        await initAudio();
        playQuestion(false);
        setFeedback("A çalıyor", "Şu an temiz referans sesi dinliyorsun.");
        setTimeout(() => {
          if (!activeQuestion) return;
          playQuestion(true);
          setFeedback("B çalıyor", "Şu an işlenmiş sesi dinliyorsun.");
        }, 1400);
        setTimeout(() => {
          abDemoLock = false;
          setFeedback("A/B tamamlandı", "İstersen tekrar A veya B düğmeleriyle ayrı ayrı dinleyebilirsin.");
        }, 2900);
      }

      function getCorrectValue(q) {
        if (q.mode === "filter") return q.filterType;
        if (q.mode === "frequency") return q.freqRange.key;
        return q.instrument.key;
      }

      function correctLabel(q) {
        if (q.mode === "filter") return q.filterLabel;
        if (q.mode === "frequency") return formatHz(q.freq);
        return q.instrument.label;
      }

      function setFeedback(title, detail) {
        els.feedbackBox.querySelector("strong").textContent = title;
        els.feedbackDetail.textContent = detail;
      }

      function renderQuestion() {
        const q = activeQuestion;
        roundActive = true;
        const L = q.layer || 1;

        els.questionTitle.textContent =
          q.mode !== "proplus"
            ? "Hangi frekansla oynandı? Dalga üzerine tıkla."
            : L === 2
            ? "Frekansı bul, sonra kaç dB olduğunu seç."
            : L === 3
            ? "4 frekansı işaretle — her tık için yönü de seç (aç/kıs)."
            : "4 frekansla oynandı — dördünü de dalga üzerinde işaretle.";

        els.questionMeta.textContent = modeDescription(q);
        els.streakText.textContent = q.boss ? "Boss round aktif" : (stats.combo > 1 ? `${stats.combo}x combo aktif` : "Yeni challenge");
        els.roundChip.textContent = `Round ${stats.rounds + 1}`;
        els.scoreChip.textContent = `Skor ${diffState().score}`;
        els.bossChip.textContent = q.boss ? "Boss" : "Normal";
        els.bossChip.className = `chip ${q.boss ? "boss" : ""}`;

        // Tüm Pro Plus katmanları + tek bant: wave'e tıklama. Şıkları gizle.
        freqGuessHz = null; freqHoverHz = null;
        if (q.mode === "proplus") { q.guesses = []; q._result = null; }
        ppRevealCount = 0; ppRevealGlow = 0;
        proplusDir = 1; // K3 için sıradaki tıklamanın yönü
        els.answers.innerHTML = "";
        els.answers.classList.add("hidden");
        els.freqGuessArea.classList.remove("hidden");
        renderGuessAreaControls(q);
        if (els.freqInfo) els.freqInfo.classList.add("hidden");

        setFeedback(
          q.boss ? "Boss round başladı!" : "Hazır mısın?",
          q.mode !== "proplus"
            ? "A/B ile karşılaştır, sonra dalga üzerine tıklayıp doğru frekansı işaretle."
            : L === 2
            ? "A/B ile karşılaştır. Tek frekansla oynandı — yerini tıkla, sonra kaç dB olduğunu seç."
            : L === 3
            ? "A/B ile karşılaştır. 4 frekans var; her birini işaretlerken yön düğmesinden aç/kıs seç."
            : "A/B ile karşılaştır. 4 frekansla oynandı (kimi açık, kimi kısık). Dört noktaya da tıkla."
        );
      }

      // K2 dB seçici / K3 yön düğmesi / K1 sayaç — tıklama alanı kontrolleri
      let proplusDir = 1;
      let ppRevealCount = 0;   // kaç bant açıldı (sıralı parlama)
      let ppRevealGlow = 0;    // son açılan bandın parlama şiddeti
      function renderGuessAreaControls(q) {
        const area = els.freqGuessArea;
        const L = q.layer || 1;
        if (q.mode !== "proplus") {
          area.innerHTML = `<span style="color:var(--cyan);font-size:14px;font-weight:700">👆 Dalga üzerine tıklayarak doğru frekansı işaretle</span>`;
          return;
        }
        if (L === 3) {
          area.innerHTML =
            `<span style="color:var(--cyan);font-size:14px;font-weight:700">Yön: </span>
             <div class="seg" style="display:inline-flex">
               <button type="button" id="dirUp" class="on" style="padding:8px 14px;font-weight:700">▲ Aç</button>
               <button type="button" id="dirDown" style="padding:8px 14px;font-weight:700">▼ Kıs</button>
             </div>
             <span id="ppCount" style="color:var(--muted);font-size:13px">Sonra dalgaya tıkla · kalan: 4</span>`;
          const up = area.querySelector("#dirUp"), down = area.querySelector("#dirDown");
          up.addEventListener("click", () => { proplusDir = 1; up.classList.add("on"); down.classList.remove("on"); });
          down.addEventListener("click", () => { proplusDir = -1; down.classList.add("on"); up.classList.remove("on"); });
        } else if (L === 2) {
          area.innerHTML = `<span id="ppCount" style="color:var(--cyan);font-size:14px;font-weight:700">👆 Önce frekansın yerini dalga üzerinde tıkla</span>`;
        } else {
          area.innerHTML = `<span id="ppCount" style="color:var(--cyan);font-size:14px;font-weight:700">👆 Dört ayrı frekansı işaretle · kalan: 4</span>`;
        }
      }

      function rewardXp(q) {
        const base = DIFFICULTY[q.difficulty].xp;
        const comboBoost = Math.min(2.4, 1 + stats.combo * 0.12);
        const hintPenalty = q.hintUsed ? 0.65 : 1;
        const bossBoost = q.boss ? 1.65 : 1;
        const timeBoost = timeLeft > roundDuration * 0.55 ? 1.2 : 1;
        return Math.round(base * comboBoost * hintPenalty * bossBoost * timeBoost * xpMult());
      }

      function evaluate(q, guess) {
        return guess === getCorrectValue(q);
      }

      function pushHistory(correct) {
        history.unshift({
          icon: correct ? "✅" : "❌",
          title: correct ? `${correctLabel(activeQuestion)} doğru bulundu` : `${correctLabel(activeQuestion)} kaçırıldı`,
          desc: `${activeQuestion.filterLabel} · ${formatHz(activeQuestion.freq)} · ${labelSource(activeQuestion.source)}${activeQuestion.boss ? " · Boss" : ""}`
        });
        history = history.slice(0, 12);
        renderHistory();
      }

      function startTimer(seconds) {
        clearTimer();
        roundDuration = seconds;
        timeLeft = seconds;
        updateTimerUI();

        timerInterval = setInterval(() => {
          timeLeft = Math.max(0, timeLeft - 0.1);
          updateTimerUI();
          if (timeLeft <= 0) {
            clearTimer();
            onTimeUp();
          }
        }, 100);
      }

      function clearTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
      }

      function updateTimerUI() {
        els.timerText.textContent = `${timeLeft.toFixed(1)}s`;
        const pct = roundDuration ? (timeLeft / roundDuration) * 100 : 0;
        els.timerBar.style.width = `${Math.max(0, pct)}%`;
      }

      function renderHearts() {
        const maxLives = currentDifficulty().lives;
        els.hearts.innerHTML = "";
        for (let i = 0; i < maxLives; i++) {
          const span = document.createElement("span");
          span.className = `heart ${i < currentLives ? "" : "off"}`;
          span.textContent = "♥";
          els.hearts.appendChild(span);
        }
      }

      function resetLives() {
        currentLives = currentDifficulty().lives;
        diffState().lives = currentLives;
        renderHearts();
      }

      // seçili zorluğun kayıtlı canını yükle (zorluk değişince)
      function syncLives() {
        const d = diffState();
        if (typeof d.lives !== "number") d.lives = currentDifficulty().lives;
        currentLives = d.lives;
        renderHearts();
      }

      function loseLife(reasonText) {
        currentLives = Math.max(0, currentLives - 1);
        diffState().lives = currentLives;   // o zorluğun canına yaz
        renderHearts();
        if (currentLives <= 0) {
          stopAudio();
          roundActive = false;
          clearTimer();
          setFeedback("Oyun bitti", `${reasonText} Bu zorluktaki canların tükendi. Tekrar başlatabilirsin.`);
          toast("💔 Oyun Bitti", "Bu zorlukta canların tükendi.");
        } else {
          setFeedback("Can kaybettin", `${reasonText} Kalan can: ${currentLives}`);
        }
      }

      function onTimeUp() {
        if (!roundActive || !activeQuestion) return;
        roundActive = false;
        if (activeQuestion.mode === "frequency") activeQuestion.freqRevealed = true;
        stats.rounds++;
        stats.wrong++;
        stats.combo = 0;
        diffState().score -= 20;
        stopAudio();
        loseLife(`Süre doldu. Doğru cevap: ${correctLabel(activeQuestion)}.`);
        pushHistory(false);
        updateDaily(false);
        updateUI();
        saveStats();
        saveDaily();
        scheduleNext();
      }

      function submitAnswer(guess, clickedBtn, options) {
        if (!roundActive || !activeQuestion) return;
        roundActive = false;
        clearTimer();

        const ok = evaluate(activeQuestion, guess);
        const correctValue = getCorrectValue(activeQuestion);
        const buttons = [...els.answers.querySelectorAll(".answer-btn")];

        buttons.forEach((btn, i) => {
          btn.disabled = true;
          const opt = options[i];
          if (opt.value === correctValue) btn.classList.add("correct");
          if (opt.value === guess && !ok) btn.classList.add("wrong");
        });

        stats.rounds++;

        if (ok) {
          stats.correct++;
          stats.combo++;
          stats.bestCombo = Math.max(stats.bestCombo, stats.combo);

          const gained = rewardXp(activeQuestion);
          diffState().xp += gained;
          diffState().score += gained * Math.max(1, stats.combo);
          diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
          if (activeQuestion.difficulty === "pro") stats.proCorrect++;
          if (activeQuestion.boss) stats.bossWins++;

          setFeedback("Doğru cevap!", `${correctLabel(activeQuestion)} doğruydu. +${gained} XP kazandın.`);
          spawnXp(`+${gained} XP`, clickedBtn);
          burst(clickedBtn);
        } else {
          stats.wrong++;
          stats.combo = 0;
          diffState().score -= 20;
          setFeedback("Kaçtı.", `Doğru cevap: ${correctLabel(activeQuestion)}. Merkez frekans: ${formatHz(activeQuestion.freq)}.`);
          shake(clickedBtn);
          loseLife("Yanlış cevap verdin.");
        }

        stopAudio();
        pushHistory(ok);
        updateDaily(ok);
        checkAchievements();
        updateUI();
        saveStats();
        saveDaily();
        scheduleNext();
      }

      function showFreqInfo(ok, zone, act, gained, dOct, dir) {
        if (!els.freqInfo) return;
        const color = ok ? "var(--green)" : "var(--red)";
        const head = ok
          ? `✅ ${formatHz(activeQuestion.freq)} ${act} · +${gained} XP`
          : `❌ Doğru: ${formatHz(activeQuestion.freq)} ${act} · sen ${formatHz(freqGuessHz)} dedin (${dir})`;
        els.freqInfo.style.borderColor = color;
        els.freqInfo.style.background = ok ? "rgba(104,240,171,.10)" : "rgba(255,108,136,.10)";
        els.freqInfo.innerHTML =
          `<div style="font-weight:800;color:${color};margin-bottom:6px;font-size:15px">${head}</div>` +
          `<div style="font-weight:700;color:var(--text);margin-bottom:4px">${zone.t}</div>` +
          `<div style="color:var(--muted);font-size:13.5px;line-height:1.55">${zone.tip}</div>`;
        els.freqInfo.classList.remove("hidden");
      }

      // Frekans modu: wave üzerine tıklanan tahmini değerlendir (oktav mesafesi)
      function submitFreqGuess() {
        if (!roundActive || !activeQuestion || activeQuestion.mode !== "frequency") return;
        if (!freqGuessHz) return;
        roundActive = false;
        clearTimer();

        const dOct = Math.abs(Math.log2(freqGuessHz / activeQuestion.freq));
        const ok = dOct <= 0.5; // yarım oktav içi = doğru
        activeQuestion.freqRevealed = true;

        stats.rounds++;
        if (ok) {
          stats.correct++;
          stats.combo++;
          stats.bestCombo = Math.max(stats.bestCombo, stats.combo);
          const gained = rewardXp(activeQuestion);
          diffState().xp += gained;
          diffState().score += gained * Math.max(1, stats.combo);
          diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
          if (activeQuestion.difficulty === "pro") stats.proCorrect++;
          if (activeQuestion.boss) stats.bossWins++;
          const quality = dOct <= 0.17 ? "🎯 Tam isabet!" : (dOct <= 0.33 ? "Çok iyi!" : "Doğru!");
          const zone = faZoneOf(activeQuestion.freq);
          const act = activeQuestion.gain >= 0 ? "yükseltildi ▲" : "kesildi ▼";
          setFeedback(quality, `${formatHz(activeQuestion.freq)} ${act} · ${zone.t}. ${zone.tip} (+${gained} XP)`);
          showFreqInfo(true, zone, act, gained, dOct, "");
          recordZone(activeQuestion.freq, true);
          sfxDing();
          spawnXp(`+${gained} XP`, els.canvas);
          burst(els.canvas);
          challengeTick(true, gained);
        } else {
          stats.wrong++;
          stats.combo = 0;
          diffState().score -= 20;
          const dir2 = freqGuessHz > activeQuestion.freq ? "daha tiz seçtin" : "daha pes seçtin";
          const zone = faZoneOf(activeQuestion.freq);
          const act = activeQuestion.gain >= 0 ? "yükseltildi ▲" : "kesildi ▼";
          setFeedback("Kaçtı — ama öğren:", `Doğru ${formatHz(activeQuestion.freq)} ${act}, sen ${formatHz(freqGuessHz)} dedin (${dOct.toFixed(2)} oktav, ${dir2}). ${zone.t}: ${zone.tip}`);
          showFreqInfo(false, zone, act, 0, dOct, dir2);
          recordZone(activeQuestion.freq, false);
          sfxBuzz();
          shake(els.canvas);
          loseLife("Frekansı ıskaladın.");
          challengeTick(false, 0);
        }

        stopAudio();
        pushHistory(ok);
        updateDaily(ok);
        checkAchievements();
        updateUI();
        saveStats();
        saveDaily();
        scheduleNext();
      }

      // Katman 2: frekans + dB tahmini
      function submitLayer2Guess(hz, dbGuess) {
        if (!activeQuestion || activeQuestion.mode !== "proplus") return;
        const q = activeQuestion;
        q.freqRevealed = true;
        const dOct = Math.abs(Math.log2(hz / q.freq));
        const dbErr = Math.abs(dbGuess - q.gainDb);
        const freqOk = dOct <= 0.5;
        const dbOk = dbErr <= 3; // bir kademe tolerans
        const ok = freqOk && dbOk;
        recordZone(q.freq, freqOk);

        stats.rounds++;
        let gained = 0;
        if (ok) {
          stats.correct++; stats.combo++; stats.bestCombo = Math.max(stats.bestCombo, stats.combo);
          gained = Math.round(rewardXp(q) * 1.3);
          diffState().xp += gained; diffState().score += gained * Math.max(1, stats.combo);
          diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
          if (q.boss) stats.bossWins++;
          setFeedback("🎯 Doğru!", `Frekans ve dB tuttu. +${gained} XP.`);
          sfxDing();
          spawnXp(`+${gained} XP`, els.canvas); burst(els.canvas);
        } else {
          stats.wrong++; stats.combo = 0; diffState().score -= 15;
          setFeedback("Kaçtı — ama öğren:", `${freqOk ? "Frekans doğru" : "Frekans şaştı"}, ${dbOk ? "dB doğru" : "dB şaştı"}.`);
          sfxBuzz();
          shake(els.canvas); loseLife("Katman 2 ıskaladın.");
        }
        const dir = q.gain >= 0 ? "▲ açık" : "▼ kısık";
        const zone = faZoneOf(q.freq);
        els.freqInfo.style.borderColor = ok ? "var(--green)" : "var(--red)";
        els.freqInfo.style.background = ok ? "rgba(104,240,171,.10)" : "rgba(255,108,136,.10)";
        els.freqInfo.innerHTML =
          `<div style="font-weight:800;color:${ok?'var(--green)':'var(--red)'};margin-bottom:6px;font-size:15px">${ok?'✅ Doğru':'❌ Kaçtı'}: ${formatHz(q.freq)} ${dir} · ${q.gainDb} dB</div>` +
          `<div style="color:var(--muted);font-size:13px">Sen: ${formatHz(hz)} · ${dbGuess} dB dedin.</div>` +
          `<div style="font-weight:700;margin-top:6px">${zone.t}</div><div style="color:var(--muted);font-size:13px;line-height:1.5">${zone.tip}</div>`;
        els.freqInfo.classList.remove("hidden");
        challengeTick(ok, gained);
        // sayaç alanını temizle
        els.freqGuessArea.innerHTML = `<span style="color:var(--muted);font-size:13px">Tur bitti · "Yeni Soru" ile devam.</span>`;
        stopAudio(); pushHistory(ok); updateDaily(ok); checkAchievements(); updateUI(); saveStats(); saveDaily(); scheduleNext();
      }

      // Katman 1 & 3: 4 tahmini 4 banda eşleştir, puanla (K3'te yön de kontrol)
      function submitProPlusGuess() {
        if (!roundActive || !activeQuestion || activeQuestion.mode !== "proplus") return;
        roundActive = false;
        clearTimer();
        const q = activeQuestion;
        q.freqRevealed = true;
        const isL3 = (q.layer || 1) === 3;

        const bands = q.bands.map(b => ({ ...b, matched:false, guessHz:null, dOct:null, dirGuess:null }));
        const guesses = q.guesses.slice();
        guesses.forEach(g => {
          const gHz = isL3 ? g.hz : g;
          let bi = -1, best = Infinity;
          bands.forEach((b, i) => {
            if (b.matched) return;
            const d = Math.abs(Math.log2(gHz / b.freq));
            if (d < best) { best = d; bi = i; }
          });
          if (bi >= 0) { bands[bi].matched = true; bands[bi].guessHz = gHz; bands[bi].dOct = best; if (isL3) bands[bi].dirGuess = g.dir; }
        });

        let hit = 0;
        bands.forEach(b => {
          const posOk = b.dOct !== null && b.dOct <= 0.5;
          const dirOk = !isL3 || (b.dirGuess !== null && Math.sign(b.dirGuess) === Math.sign(b.gain));
          const bandOk = posOk && dirOk;
          if (bandOk) hit++;
          recordZone(b.freq, bandOk);
        });
        const allOk = hit === bands.length;

        stats.rounds++;
        let gained = 0;
        if (hit >= 3) {
          stats.correct++; stats.combo++; stats.bestCombo = Math.max(stats.bestCombo, stats.combo);
          gained = Math.round(rewardXp(q) * (hit / 4) * (isL3 ? 1.8 : 1.5));
          diffState().xp += gained; diffState().score += gained * Math.max(1, stats.combo);
          diffState().bestScore = Math.max(diffState().bestScore, diffState().score);
          if (q.boss) stats.bossWins++;
          setFeedback(allOk ? "🎯 Dördü de doğru!" : `İyi! ${hit}/4 doğru`, `+${gained} XP kazandın.`);
          spawnXp(`+${gained} XP`, els.canvas); burst(els.canvas);
        } else {
          stats.wrong++; stats.combo = 0; diffState().score -= 15;
          setFeedback("Kaçtı — ama öğren:", `${hit}/4 doğru. Aşağıda dört bandın yerini ve yönünü gör.`);
          shake(els.canvas); loseLife("Bantları ıskaladın.");
        }
        challengeTick(hit >= 3, gained);
        showProPlusInfo(bands, hit, isL3);
        els.freqGuessArea.innerHTML = `<span style="color:var(--muted);font-size:13px">Tur bitti · "Yeni Soru" ile devam.</span>`;

        // sıralı parlama: her bandı tek tek yeşil/kırmızı yak + doğruya ding
        q._result = bands.map(b => ({
          freq: b.freq, gain: b.gain,
          correct: (b.dOct !== null && b.dOct <= 0.5) && (!isL3 || (b.dirGuess !== null && Math.sign(b.dirGuess) === Math.sign(b.gain)))
        })).sort((a,z) => a.freq - z.freq);
        startPpReveal();

        stopAudio(); pushHistory(hit >= 3); updateDaily(hit >= 3); checkAchievements(); updateUI(); saveStats(); saveDaily(); scheduleNext();
      }

      // 4 bandı tek tek aç: her açılışta ding/buzz + parlama
      function startPpReveal() {
        ppRevealCount = 0; ppRevealGlow = 0;
        const q = activeQuestion;
        function openNext() {
          if (!q || !q._result || ppRevealCount >= q._result.length) return;
          ppRevealCount++;
          const b = q._result[ppRevealCount - 1];
          if (b.correct) sfxDing(); else sfxBuzz();
          // parlama sönümü
          ppRevealGlow = 1;
          const t0 = performance.now();
          (function fade(t){
            ppRevealGlow = Math.max(0, 1 - (t - t0) / 300);
            if (ppRevealGlow > 0) requestAnimationFrame(fade);
          })(t0);
          if (ppRevealCount < q._result.length) setTimeout(openNext, 340);
        }
        openNext();
      }

      function showProPlusInfo(bands, hit, isL3) {
        if (!els.freqInfo) return;
        const ok = hit >= 3;
        const color = ok ? "var(--green)" : "var(--red)";
        els.freqInfo.style.borderColor = color;
        els.freqInfo.style.background = ok ? "rgba(104,240,171,.10)" : "rgba(255,108,136,.10)";
        let rows = bands.map(b => {
          const act = b.gain >= 0 ? "▲ açık" : "▼ kısık";
          const zone = faZoneOf(b.freq);
          const posOk = b.dOct !== null && b.dOct <= 0.5;
          const dirOk = !isL3 || (b.dirGuess !== null && Math.sign(b.dirGuess) === Math.sign(b.gain));
          const doğru = posOk && dirOk;
          const mark = doğru ? "✅" : "❌";
          let senin = b.guessHz ? `sen: ${formatHz(b.guessHz)}` : "işaretlemedin";
          if (isL3 && b.dirGuess !== null) senin += ` ${b.dirGuess >= 0 ? "▲" : "▼"}`;
          return `<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,.08)">
            <b style="color:${doğru ? 'var(--green)' : 'var(--red)'}">${mark} ${formatHz(b.freq)} ${act}</b>
            <span style="color:var(--muted)">· ${zone.t.split(' (')[0]} · ${senin}</span></div>`;
        }).join("");
        els.freqInfo.innerHTML =
          `<div style="font-weight:800;color:${color};margin-bottom:4px;font-size:15px">${hit}/4 doğru${isL3 ? " (yön dahil)" : ""}</div>` + rows;
        els.freqInfo.classList.remove("hidden");
      }

      function updateDaily(correct) {
        daily.tasks.forEach(task => {
          if (task.id === "d1") task.value = Math.min(task.target, stats.rounds);
          if (task.id === "d2") task.value = Math.min(task.target, stats.correct);
          if (task.id === "d3") task.value = Math.min(task.target, stats.bestCombo);
        });

        daily.tasks.forEach(task => {
          if (!task.claimed && task.value >= task.target) {
            task.claimed = true;
            diffState().xp += task.reward;
            toast("📅 Günlük görev tamamlandı", `${task.title} · +${task.reward} XP`);
          }
        });

        renderDaily();
      }

      function updateUI() {
        const xp = xpProgress(diffState().xp);
        const percent = Math.max(0, Math.min(100, (xp.current / xp.required) * 100));

        els.levelValue.textContent = xp.level;
        els.xpValue.textContent = diffState().xp;
        els.comboValue.textContent = `${stats.combo}x`;
        els.accuracyValue.textContent = `%${accuracy()}`;
        els.progressText.textContent = `${xp.current} / ${xp.required} XP`;
        els.xpBar.style.width = `${percent}%`;

        els.roundsValue.textContent = stats.rounds;
        els.correctValue.textContent = stats.correct;
        if (els.wrongValue) els.wrongValue.textContent = stats.wrong;
        if (els.avgScoreValue) els.avgScoreValue.textContent = stats.rounds > 0 ? Math.round(diffState().score / stats.rounds) : 0;
        els.bestComboValue.textContent = `${stats.bestCombo}x`;
        els.bestScoreValue.textContent = diffState().bestScore;
        els.scoreChip.textContent = `Skor ${diffState().score}`;
        els.streakText.textContent = stats.combo > 1 ? `${stats.combo}x combo aktif` : "Akışta kal";

        renderAchievements();
        renderHearts();
        renderAnalysis();
      }

      function renderDaily() {
        els.dailyList.innerHTML = "";
        daily.tasks.forEach(task => {
          const div = document.createElement("div");
          div.className = "daily-card";
          div.innerHTML = `
            <h4>${task.title}</h4>
            <p>${task.desc}</p>
            <div class="progress-shell" style="margin-top:10px;padding:10px;">
              <div class="progress-label">
                <span>${task.value} / ${task.target}</span>
                <span>${task.claimed ? "Tamamlandı" : "+" + task.reward + " XP"}</span>
              </div>
              <div class="progress"><span style="width:${Math.min(100, (task.value / task.target) * 100)}%"></span></div>
            </div>
          `;
          els.dailyList.appendChild(div);
        });
      }

      function renderAchievements() {
        const unlocked = new Set(stats.unlocked || []);
        els.achievementList.innerHTML = "";

        ACHIEVEMENTS.forEach(a => {
          const div = document.createElement("div");
          div.className = `achievement ${unlocked.has(a.id) ? "" : "locked"}`;
          div.innerHTML = `
            <div class="icon">${a.icon}</div>
            <div>
              <h4>${a.title}</h4>
              <p>${a.desc}</p>
            </div>
          `;
          els.achievementList.appendChild(div);
        });
      }

      function renderHistory() {
        els.historyList.innerHTML = "";
        if (!history.length) {
          const div = document.createElement("div");
          div.className = "history";
          div.innerHTML = `<div class="icon">📝</div><div><h4>Henüz kayıt yok</h4><p>İlk turdan sonra son cevapların burada görünür.</p></div>`;
          els.historyList.appendChild(div);
          return;
        }

        history.forEach(h => {
          const div = document.createElement("div");
          div.className = "history";
          div.innerHTML = `<div class="icon">${h.icon}</div><div><h4>${h.title}</h4><p>${h.desc}</p></div>`;
          els.historyList.appendChild(div);
        });
      }

      function checkAchievements() {
        if (!stats.unlocked) stats.unlocked = [];
        ACHIEVEMENTS.forEach(a => {
          if (!stats.unlocked.includes(a.id) && a.check(stats)) {
            stats.unlocked.push(a.id);
            toast(`${a.icon} ${a.title}`, a.desc);
          }
        });
      }

      function toast(title, desc) {
        const el = document.createElement("div");
        el.className = "toast";
        el.innerHTML = `<b>${title}</b><small>${desc}</small>`;
        document.body.appendChild(el);
        setTimeout(() => {
          el.style.opacity = "0";
          el.style.transform = "translateY(10px)";
          el.style.transition = ".3s ease";
        }, 2400);
        setTimeout(() => el.remove(), 2800);
      }

      function spawnXp(text, anchor) {
        const rect = anchor.getBoundingClientRect();
        const el = document.createElement("div");
        el.className = "floating-xp";
        el.textContent = text;
        el.style.left = `${rect.left + rect.width / 2}px`;
        el.style.top = `${rect.top + window.scrollY - 6}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1450);
      }

      function burst(anchor) {
        const rect = anchor.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2 + window.scrollY;

        for (let i = 0; i < 18; i++) {
          const p = document.createElement("div");
          p.className = "particle";
          p.style.left = `${x}px`;
          p.style.top = `${y}px`;
          p.style.setProperty("--dx", `${randomBetween(-120, 120)}px`);
          p.style.setProperty("--dy", `${randomBetween(-100, 40)}px`);
          p.style.width = `${randomBetween(5, 10)}px`;
          p.style.height = p.style.width;
          document.body.appendChild(p);
          setTimeout(() => p.remove(), 920);
        }
      }

      function shake(node) {
        node.animate([
          { transform: "translateX(0)" },
          { transform: "translateX(-8px)" },
          { transform: "translateX(8px)" },
          { transform: "translateX(-5px)" },
          { transform: "translateX(0)" }
        ], { duration: 360, easing: "ease-out" });
      }

      function giveHint() {
        if (!activeQuestion || !roundActive) return;
        activeQuestion.hintUsed = true;
        stats.hintsUsed++;
        saveStats();

        let msg = "";
        if (activeQuestion.mode === "filter") {
          msg = activeQuestion.filterType.includes("shelf")
            ? "Bu bir shelf ailesinden."
            : activeQuestion.filterType.includes("pass")
            ? "Bu bir pass filtresi."
            : activeQuestion.filterType === "notch"
            ? "Bu dar oyuk oluşturan bir filtre."
            : "Bu merkez odaklı bir bell hareketi gibi düşün.";
        } else if (activeQuestion.mode === "frequency") {
          msg = `Merkez yaklaşık ${formatHz(activeQuestion.freq)} civarında.`;
        } else {
          msg = `Karakter, ${activeQuestion.instrument.label} yönünde düşünülmeli.`;
        }

        setFeedback("İpucu verildi", `${msg} Bu turda XP biraz düşecek.`);
      }

      function drawFreqAxis(w, h) {
        // Hz cetveli — her zaman görünür (Hata 1)
        ctx2d.font = "700 13px 'JetBrains Mono', monospace";
        ctx2d.textAlign = "center";
        FA_TICKS.forEach(f => {
          const x = faFToX(f, w);
          ctx2d.strokeStyle = "rgba(255,255,255,.10)";
          ctx2d.beginPath(); ctx2d.moveTo(x, 6); ctx2d.lineTo(x, h - 22); ctx2d.stroke();
          ctx2d.fillStyle = "rgba(158,180,206,.9)";
          ctx2d.fillText(f >= 1000 ? (f / 1000) + "k" : f, x, h - 6);
        });
        ctx2d.textAlign = "left";
      }

      function drawFreqGuessLayer(w, h) {
        const q = activeQuestion;
        // hover çizgisi
        if (freqHoverHz && roundActive) {
          const x = faFToX(freqHoverHz, w);
          ctx2d.strokeStyle = "rgba(111,211,255,.55)";
          ctx2d.setLineDash([4,4]);
          ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, h - 22); ctx2d.stroke();
          ctx2d.setLineDash([]);
        }

        // ---- PRO PLUS çok bantlı (K1/K3) ----
        if (q && q.mode === "proplus" && q.bands) {
          const isL3 = (q.layer || 1) === 3;
          // kullanıcının işaretledikleri: tur boyunca VE reveal'da mavi kalsın
          (q.guesses || []).forEach(g => {
            const gHz = isL3 ? g.hz : g;
            const x = faFToX(gHz, w);
            ctx2d.strokeStyle = roundActive ? "#6fd3ff" : "rgba(111,211,255,.85)";
            ctx2d.lineWidth = roundActive ? 3 : 2;
            ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, h - 22); ctx2d.stroke();
            if (!roundActive) {
              ctx2d.fillStyle = "rgba(111,211,255,.95)"; ctx2d.font = "700 11px 'JetBrains Mono', monospace"; ctx2d.textAlign = "center";
              ctx2d.fillText("sen", x, h - 30); ctx2d.textAlign = "left";
            }
          });
          // cevap açıldıysa: sıralı parlama ile doğru=yeşil / yanlış=kırmızı
          if (!roundActive && q.freqRevealed && q._result) {
            q._result.forEach((b, i) => {
              if (i >= ppRevealCount) return; // henüz sırası gelmedi
              const x = faFToX(b.freq, w);
              const col = b.correct ? "#68f0ab" : "#ff6c88";
              const up = b.gain >= 0;
              // parlama halkası (son açılan bant için)
              if (i === ppRevealCount - 1 && ppRevealGlow > 0) {
                ctx2d.save();
                ctx2d.globalAlpha = ppRevealGlow;
                ctx2d.strokeStyle = col; ctx2d.lineWidth = 10;
                ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, h - 22); ctx2d.stroke();
                ctx2d.restore();
              }
              ctx2d.strokeStyle = col; ctx2d.lineWidth = 3; ctx2d.setLineDash([5,4]);
              ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, h - 22); ctx2d.stroke(); ctx2d.setLineDash([]);
              ctx2d.fillStyle = col; ctx2d.font = "800 13px 'JetBrains Mono', monospace"; ctx2d.textAlign = "center";
              ctx2d.fillText((b.correct ? "✓ " : "✗ ") + (up ? "▲" : "▼") + formatHz(b.freq), x, up ? 26 : h/2);
            });
            ctx2d.textAlign = "left";
          }
          return;
        }

        // ---- TEK BANT (frekans modu + Pro Plus K2) ----
        const l2guess = (q && q.mode === "proplus" && q.guesses && q.guesses.length) ? q.guesses[0] : null;
        const showGuess = freqGuessHz || l2guess;
        if (showGuess) {
          const x = faFToX(showGuess, w);
          ctx2d.strokeStyle = "#6fd3ff"; ctx2d.lineWidth = 3;
          ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, h - 22); ctx2d.stroke();
          ctx2d.fillStyle = "#6fd3ff"; ctx2d.font = "800 15px 'JetBrains Mono', monospace"; ctx2d.textAlign = "center";
          ctx2d.fillText(formatHz(showGuess), x, 26); ctx2d.textAlign = "left";
        }
        if (!roundActive && q && q.freqRevealed) {
          const x = faFToX(q.freq, w);
          const up = q.gain >= 0;
          ctx2d.strokeStyle = "#ffd166"; ctx2d.lineWidth = 3; ctx2d.setLineDash([5,4]);
          ctx2d.beginPath(); ctx2d.moveTo(x, 4); ctx2d.lineTo(x, h - 22); ctx2d.stroke(); ctx2d.setLineDash([]);
          ctx2d.fillStyle = "#ffd166"; ctx2d.font = "800 15px 'JetBrains Mono', monospace"; ctx2d.textAlign = "center";
          ctx2d.fillText((up ? "▲ " : "▼ ") + formatHz(q.freq), x, h / 2); ctx2d.textAlign = "left";
        }
      }

      // Canvas tıklama/hover — sadece frekans modunda ve tur aktifken
      function faCanvasPos(e) {
        const r = els.canvas.getBoundingClientRect();
        const cssX = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        // canvas iç genişliği (attribute) ile CSS genişliği farklı olabilir; iç koordinata çevir
        return Math.max(0, Math.min(els.canvas.width, cssX * (els.canvas.width / r.width)));
      }
      const isWaveMode = () => activeQuestion && (activeQuestion.mode === "frequency" || activeQuestion.mode === "proplus");
      els.canvas.addEventListener("pointermove", e => {
        if (!isWaveMode() || !roundActive) return;
        freqHoverHz = faXToF(faCanvasPos(e), els.canvas.width);
      });
      els.canvas.addEventListener("pointerleave", () => { freqHoverHz = null; });
      els.canvas.addEventListener("pointerdown", e => {
        if (!isWaveMode() || !roundActive) return;
        const hz = faXToF(faCanvasPos(e), els.canvas.width);
        const q = activeQuestion;

        if (q.mode !== "proplus") {
          freqGuessHz = hz;
          try { submitFreqGuess(); } catch (err) { console.error(err); }
          ensureAutoNext();   // cevap verildi → otomatik geçişi garantile
          return;
        }

        const L = q.layer || 1;
        if (L === 2) {
          // tek frekans işaretle, sonra dB seçici çıkar
          q.guesses = [hz];
          roundActive = false; // tıklamayı kilitle, dB seçimi bekle
          showDbPicker(hz);
        } else if (L === 3) {
          q.guesses.push({ hz, dir: proplusDir });
          const kalan = 4 - q.guesses.length;
          const cnt = els.freqGuessArea.querySelector("#ppCount");
          if (kalan > 0) { if (cnt) cnt.textContent = `Sonra dalgaya tıkla · kalan: ${kalan}`; }
          else { try { submitProPlusGuess(); } catch (err) { console.error(err); } ensureAutoNext(); }
        } else {
          // Katman 1
          q.guesses.push(hz);
          const kalan = 4 - q.guesses.length;
          const cnt = els.freqGuessArea.querySelector("#ppCount");
          if (kalan > 0) { if (cnt) cnt.textContent = `👆 Dört ayrı frekansı işaretle · kalan: ${kalan}`; }
          else { try { submitProPlusGuess(); } catch (err) { console.error(err); } ensureAutoNext(); }
        }
      });

      // Cevap verildiğinde otomatik geçişi kesin olarak kur (submit zinciri hata verse bile)
      function ensureAutoNext() {
        if (autoStopped) return;
        if (currentLives <= 0) return; // canlar bittiyse durur
        // 10 soruluk bölüm dolduysa bitir
        if (challenge.active && challenge.done >= challenge.total) {
          finishChallenge();
          return;
        }
        autoPlaying = true;
        if (els.startBtn) { els.startBtn.textContent = "⏸ Durdur"; els.startBtn.classList.add("warning"); }
        clearTimeout(autoAdvanceTimer);
        clearInterval(autoCountdownTimer);
        let remain = 2;
        const label = challenge.active ? `Soru ${challenge.done + 1}/10` : "Sonraki";
        if (els.nextBtn) els.nextBtn.textContent = `${label} (${remain}) ▶`;
        autoCountdownTimer = setInterval(() => {
          remain--;
          if (els.nextBtn) els.nextBtn.textContent = remain > 0 ? `${label} (${remain}) ▶` : "Atla ▶";
        }, 750);
        autoAdvanceTimer = setTimeout(() => {
          clearInterval(autoCountdownTimer);
          if (els.nextBtn) els.nextBtn.textContent = "Atla ▶";
          if (!autoStopped) startRound();
        }, 1500);
      }

      // Katman 2: frekans işaretlendikten sonra dB seçici
      function showDbPicker(hz) {
        const area = els.freqGuessArea;
        area.innerHTML =
          `<span style="color:var(--cyan);font-size:14px;font-weight:700">${formatHz(hz)} işaretlendi. Kaç dB?</span>
           <div class="seg" style="display:inline-flex">
             ${[3,6,9,12].map(d => `<button type="button" class="dbpick" data-db="${d}" style="padding:8px 12px;font-weight:700">${d} dB</button>`).join("")}
           </div>`;
        area.querySelectorAll(".dbpick").forEach(btn => {
          btn.addEventListener("click", () => {
            try { submitLayer2Guess(hz, parseInt(btn.dataset.db, 10)); } catch (err) { console.error(err); }
            ensureAutoNext();
          });
        });
      }

      function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);

        const w = els.canvas.width;
        const h = els.canvas.height;
        ctx2d.clearRect(0, 0, w, h);

        ctx2d.fillStyle = "rgba(255,255,255,.04)";
        for (let x = 0; x < w; x += 40) ctx2d.fillRect(x, 0, 1, h);
        for (let y = 0; y < h; y += 36) ctx2d.fillRect(0, y, w, 1);

        if (!visualizerOn || !audioReady) {
          ctx2d.fillStyle = "rgba(255,255,255,.22)";
          ctx2d.font = "700 22px Inter, sans-serif";
          ctx2d.fillText("Visualizer pasif", 30, 46);
          drawFreqAxis(w, h);
          if (isWaveMode()) drawFreqGuessLayer(w, h);
          return;
        }

        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);

        const grad = ctx2d.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "rgba(111,211,255,.95)");
        grad.addColorStop(1, "rgba(139,125,255,.95)");

        ctx2d.beginPath();
        ctx2d.lineWidth = 3;
        ctx2d.strokeStyle = grad;

        const step = w / data.length;
        for (let i = 0; i < data.length; i++) {
          const x = i * step;
          const y = h - (data[i] / 255) * (h - 18) - 8;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();

        for (let i = 0; i < data.length; i += 8) {
          const x = i * step;
          const barH = (data[i] / 255) * (h * 0.75);
          ctx2d.fillStyle = i % 16 === 0 ? "rgba(111,211,255,.32)" : "rgba(139,125,255,.18)";
          ctx2d.fillRect(x, h - barH, Math.max(2, step * 3.5), barH);
        }

        drawFreqAxis(w, h);
        if (isWaveMode()) drawFreqGuessLayer(w, h);
      }

      async function loadUploadedAudio(file) {
        if (!file) return;
        await initAudio();
        const arr = await file.arrayBuffer();
        uploadedAudioBuffer = await audioCtx.decodeAudioData(arr.slice(0));
        uploadOffset = 0; // yeni şarkı baştan
        setFeedback("Ses yüklendi", `${file.name} başarıyla yüklendi.`);
      }

      let autoPlaying = false;      // otomatik akış açık mı
      let autoStopped = false;      // kullanıcı bilerek durdurdu mu
      let autoAdvanceTimer = null;  // cevap sonrası yeni soru zamanlayıcısı
      let autoCountdownTimer = null;

      // 10 soruluk bölüm (challenge) durumu
      let challenge = { active: false, total: 10, done: 0, correct: 0, xp: 0 };
      const CHALLENGE_XP_MULT = 1.5;   // 10 soruluk bölümde doğru XP'si +%50
      function isChallenge() { return els.playModeSelect && els.playModeSelect.value === "challenge"; }
      function xpMult() { return (challenge.active && isChallenge()) ? CHALLENGE_XP_MULT : 1; }

      function startChallenge() {
        challenge = { active: true, total: 10, done: 0, correct: 0, xp: 0 };
        setFeedback("10 Soruluk Bölüm başladı", "10 soru, +%50 XP. Bol şans!");
      }
      function finishChallenge() {
        challenge.active = false;
        autoStopped = true;
        clearTimeout(autoAdvanceTimer);
        clearInterval(autoCountdownTimer);
        stopAudio();
        if (els.startBtn) { els.startBtn.textContent = "▶ Oyunu Başlat"; els.startBtn.classList.remove("warning"); }
        if (els.nextBtn) els.nextBtn.textContent = "Atla ▶";
        const acc = Math.round((challenge.correct / challenge.total) * 100);
        setFeedback(`🏁 Bölüm bitti — ${challenge.correct}/10 doğru`, `Toplam +${challenge.xp} XP (%${acc} isabet). Yeni bölüm için 'Oyunu Başlat'.`);
        toast("🏁 10 Soruluk Bölüm bitti", `${challenge.correct}/10 doğru · +${challenge.xp} XP`);
      }
      function challengeTick(wasCorrect, gainedXp) {
        if (!challenge.active) return;
        challenge.done++;
        if (wasCorrect) challenge.correct++;
        challenge.xp += Math.max(0, gainedXp || 0);
      }

      function scheduleNext(delay = 1500) {
        // Tek kaynak: ensureAutoNext (tıklama handler'ında tanımlı) işi yapar
        ensureAutoNext();
      }

      function setAutoPlay(on) {
        autoPlaying = on;
        autoStopped = !on;   // kapatınca "bilerek durduruldu" işaretle
        clearTimeout(autoAdvanceTimer);
        if (on) {
          els.startBtn.textContent = "⏸ Durdur";
          els.startBtn.classList.add("warning");
          startRound();
        } else {
          els.startBtn.textContent = "▶ Oyunu Başlat";
          els.startBtn.classList.remove("warning");
          clearTimer();
          stopAudio();
          setFeedback("Durduruldu", "Kaldığın yerden 'Oyunu Başlat' ile devam edebilirsin.");
        }
      }

      function startRound() {
        if (els.sourceSelect.value === "upload" && !uploadedAudioBuffer) {
          setFeedback("Önce ses yükle", "Kaynak olarak yüklenen ses seçiliyse bir mp3/wav dosyası seçmelisin.");
          return;
        }

        if (currentLives <= 0) resetLives();
        autoStopped = false;  // oyun akışta → otomatik geçiş açık
        autoPlaying = true;
        if (els.startBtn) { els.startBtn.textContent = "⏸ Durdur"; els.startBtn.classList.add("warning"); }

        activeQuestion = buildQuestion();
        renderQuestion();
        playQuestion(true);
        scrollToAnalyzer();

        if (els.timerModeSelect && els.timerModeSelect.value === "off") {
          clearTimer();
          els.timerText.textContent = "∞";
          els.timerBar.style.width = "100%";
        } else {
          const baseTime = currentDifficulty().time;
          const time = activeQuestion.boss ? Math.max(6, baseTime - 2) : baseTime;
          startTimer(time);
        }
      }

      // Mobilde oyun başlayınca dalgayı görünür yap (tıklama alanına hızlı erişim)
      function scrollToAnalyzer() {
        const isTouch = window.matchMedia("(hover:none) and (pointer:coarse)").matches;
        if (!isTouch) return;
        const wrap = els.canvas && els.canvas.closest(".visualizer-wrap");
        const target = wrap || els.canvas;
        if (!target) return;
        requestAnimationFrame(() => {
          const rect = target.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;
          // dalga zaten büyük ölçüde ekrandaysa kaydırma (otomatik akışta zıplamayı önler)
          const görünür = rect.top >= 0 && rect.top < vh * 0.5 && rect.bottom <= vh;
          if (görünür) return;
          const y = window.scrollY + rect.top - 70; // üstte biraz nefes payı
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        });
      }

      function restartSession() {
        autoPlaying = false;
        autoStopped = false;
        clearTimeout(autoAdvanceTimer);
        if (els.startBtn) { els.startBtn.textContent = "▶ Oyunu Başlat"; els.startBtn.classList.remove("warning"); }
        resetLives();
        clearTimer();
        stopAudio();
        activeQuestion = null;
        roundActive = false;
        updateUI();
        setFeedback("Yeni seri hazır", "Oyunu Başlat ile devam edebilirsin.");
      }

      els.audioFileInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          await loadUploadedAudio(file);
        } catch {
          setFeedback("Yükleme hatası", "Bu ses dosyası açılamadı. Farklı bir mp3/wav dene.");
        }
      });

      els.startBtn.addEventListener("click", async () => {
        await initAudio();
        if (currentLives <= 0) resetLives();
        // akış aktifse durdur, değilse başlat
        if (autoPlaying && !autoStopped) {
          setAutoPlay(false);
        } else {
          if (isChallenge()) startChallenge();   // 10 soruluk bölüm sıfırdan
          setAutoPlay(true);
        }
      });

      els.nextBtn.addEventListener("click", async () => {
        await initAudio();
        if (currentLives <= 0) resetLives();
        autoStopped = false;             // Atla ile akış tekrar açılır
        clearTimeout(autoAdvanceTimer);  // beklemeyi iptal et, hemen geç
        startRound();
      });

      els.playACleanBtn.addEventListener("click", async () => {
        await initAudio();
        if (!activeQuestion) {
          startRound();
          return;
        }
        playQuestion(false);
        setFeedback("A modu", "Şu an temiz referans sesi dinliyorsun.");
      });

      els.playBFilteredBtn.addEventListener("click", async () => {
        await initAudio();
        if (!activeQuestion) {
          startRound();
          return;
        }
        playQuestion(true);
        setFeedback("B modu", "Şu an işlenmiş sesi dinliyorsun.");
      });

      els.abAutoBtn.addEventListener("click", async () => {
        await initAudio();
        if (!activeQuestion) {
          startRound();
          return;
        }
        playABDemo();
      });

      els.replayBtn.addEventListener("click", async () => {
        await initAudio();
        if (!activeQuestion) {
          startRound();
          return;
        }
        playQuestion(currentPlayMode === "filtered");
      });

      els.hintBtn.addEventListener("click", giveHint);

      els.toggleVisualizerBtn.addEventListener("click", () => {
        visualizerOn = !visualizerOn;
        setFeedback("Visualizer değişti", visualizerOn ? "Spektrum tekrar görünür oldu." : "Spektrum gizlendi.");
      });

      els.resetStatsBtn.addEventListener("click", () => {
        if (!confirm("Tüm istatistikler, ilerleme ve görevler sıfırlansın mı?")) return;
        try {
          localStorage.removeItem("eqEarTrainerProXStats");
          localStorage.removeItem("eqEarTrainerProXDaily");
          mirrorRemove("eqEarTrainerProXStats");
          mirrorRemove("eqEarTrainerProXDaily");
        } catch (e) {}
        stats = freshStats();
        history = [];
        daily = freshDaily();
        activeQuestion = null;
        roundActive = false;
        freqGuessHz = null; freqHoverHz = null;
        syncLives();
        clearTimer();
        stopAudio();
        saveStats();
        saveDaily();
        updateUI();
        renderHistory();
        renderDaily();
        renderAchievements();
        renderHearts();
        updateTimerUI();
        setFeedback("Sıfırlandı", "Tüm ilerleme, XP, skor ve görevler temizlendi.");
        toast("🔄 Sıfırlandı", "Her şey baştan.");
      });

      function updateLayerVisibility() {
        els.layerControl.classList.toggle("hidden", els.modeSelect.value !== "proplus");
      }
      updateLayerVisibility();
      renderAnalysis();
      (function(){
        const ar = document.getElementById("analysisReset");
        if (ar) ar.addEventListener("click", () => {
          if (!confirm("Kişisel analiz verisi (bölge başarıların) sıfırlansın mı?")) return;
          zoneStats = {};
          try { localStorage.removeItem("fa_zonestats"); mirrorRemove("fa_zonestats"); } catch(e){}
          renderAnalysis();
        });
      })();

      els.difficultySelect.addEventListener("change", () => {
        // zorluk değişti → o zorluğun kendi canı/puanı/level'i yüklensin
        syncLives();
        updateUI();
        updateLayerVisibility();
        setFeedback("Zorluk değişti", `${els.difficultySelect.options[els.difficultySelect.selectedIndex].text} — bu zorluğun kendi puanı, level'i ve canı geldi.`);
      });

      [els.modeSelect, els.sourceSelect, els.layerSelect, els.playModeSelect].forEach(el => {
        el.addEventListener("change", () => {
          updateLayerVisibility();
          if (el === els.playModeSelect) {
            challenge.active = false;
            setAutoPlay(false);
            setFeedback("Oyun türü değişti", isChallenge() ? "10 Soruluk Bölüm seçili. 'Oyunu Başlat' ile bölümü başlat." : "Serbest oyun seçili. 'Oyunu Başlat' ile sınırsız akış.");
          } else if (activeQuestion) {
            setFeedback("Ayar değişti", "Yeni ayarlar bir sonraki turda uygulanacak.");
          }
        });
      });

      window.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          stopAudio();
        } else if (audioCtx && audioCtx.state === "suspended") {
          try { audioCtx.resume(); } catch (e) {}
        }
      });

      syncLives();
      renderHistory();
      renderAchievements();
      renderDaily();
      updateTimerUI();
      updateUI();

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tab;
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === target));
        });
      });
    })();

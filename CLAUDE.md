# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`frekans-avi-3mod (14).html` is "EQ Ear Trainer Pro X" — a Turkish-language, single-file, client-only
ear-training game. Users listen to audio processed through a Web Audio EQ chain (filters, gain,
frequency shifts) and must identify what was changed by ear. There is no backend, no build step, and
no package manifest — the entire app (HTML + inline `<style>` + inline `<script>`) lives in that one file.

## Running / testing changes

There is no build, lint, or test command. To try changes:

```bash
python3 -m http.server 8000   # then open http://localhost:8000/frekans-avi-3mod (14).html
# or
npx serve .
```

Opening the file directly via `file://` also works for most features, but audio-file upload and some
browser APIs behave more reliably served over http. Verify changes by actually playing a round in the
browser — this app is Web Audio state-machine logic and canvas drawing, not something reviewable from
source alone.

## Architecture (single file, ~2700 lines)

- Lines ~1–586: `<style>` — all CSS (custom properties in `:root`, glassmorphism cards, canvas/visualizer
  styling, responsive layout).
- Lines ~588–826: markup — stat/XP panel, mode/difficulty/source `<select>` controls, the `<canvas
  id="visualizer">`, and the question/feedback panel.
- Lines ~827 onward: `<script>` — all game logic, vanilla JS, no imports/dependencies. DOM references are
  cached once into a single `els` object near the top of the script.

### Game loop

`startRound()` → `buildQuestion()` (picks mode/difficulty-appropriate parameters) → `buildQuestionChain()`
(constructs the live Web Audio graph: source → BiquadFilterNode(s) → DynamicsCompressorNode → AnalyserNode
→ destination) → `playQuestion()` → `renderQuestion()`. The user answers via one of
`submitAnswer` / `submitFreqGuess` / `submitLayer2Guess` / `submitProPlusGuess` depending on game mode,
which call `evaluate()`, then `rewardXp()`, `pushHistory()`, `checkAchievements()`, `updateUI()`.

### Game modes

- **frequency** mode: single-band question, user picks the filter type / frequency zone / instrument
  from multiple choice (`answerOptions()` builds distractors from `FILTERS`, `FREQ_RANGES`, or
  `INSTRUMENTS` depending on question type).
- **proplus** mode: multi-band questions across three difficulty "layers" (`layerSelect`), built by
  `buildProPlusBands()`; the user clicks along a log-scale frequency axis
  (`faXToF`/`faFToX` convert between pixel-x and Hz) to place guesses, revealed via `startPpReveal()`.

Other systems layered on top of the core loop: boss rounds (`isBossRound()`, every 5th round, harder/
closer parameters), challenge mode (`startChallenge()`/`challengeTick()`, fixed 10-question session with
an XP multiplier), A/B compare (clean vs. processed playback), a canvas frequency-spectrum visualizer
(`drawVisualizer()`, driven by the shared `analyser` node), hearts/lives, combo, achievements, and daily
quests.

### Persistence

All progress is client-side `localStorage`, no server round-trip:

- `eqEarTrainerProXStats` — level/XP/history/best-score stats (`loadStats`/`saveStats`).
- `eqEarTrainerProXDaily` — daily quest state, keyed by local date (`loadDaily`/`saveDaily`/`dailyKey`).
- `fa_zonestats` — per-frequency-zone accuracy used by the "Kişisel Analiz" panel (`recordZone`/
  `renderAnalysis`).

### Audio specifics worth knowing before editing

- One shared `audioCtx`/`analyser`/`masterGain` is created lazily on first user interaction
  (`unlockAudio()`) to satisfy browser autoplay policies — iOS in particular needs the dummy-buffer
  unlock trick already in that function.
- `buildQuestionChain()` is rebuilt from scratch per question/round rather than reusing nodes; keep that
  pattern when adding new source types or filters rather than trying to mutate a persistent graph.
- Supports an optional user-uploaded audio file (`uploadedAudioBuffer`) as an alternative source to the
  built-in noise/synth generators — playback position is tracked manually (`uploadOffset`/
  `uploadStartedAt`) since `AudioBufferSourceNode` can't be paused/resumed natively.

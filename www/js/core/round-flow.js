// Soru süresi (timer) ve "cevap sonrası otomatik sıradaki soruya geçiş" motoru.
// Ses/DOM'a hiç dokunmaz — sonuçları callback'ler üzerinden dışarı bildirir, hangi
// modda olunduğunu bilmez. Duraklat/devam POLİTİKASI (ne zaman mute edilir, hangi
// etiket yazılır) çağıran tarafta (app.js) kalır; burada sadece zamanlayıcı motoru var.

export function createRoundFlow({ onTimerTick, onTimeUp, onAutoAdvanceLabel, onAdvance }) {
  let timerInterval = null;
  let timeLeft = 0;
  let roundDuration = 0;

  let autoAdvanceTimer = null;
  let autoCountdownTimer = null;
  let autoAdvanceArmedAt = 0;
  let autoAdvanceSegmentMs = 0;

  function clearTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function armTimerInterval() {
    clearTimer();
    timerInterval = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 0.1);
      onTimerTick(timeLeft, roundDuration);
      if (timeLeft <= 0) {
        clearTimer();
        onTimeUp();
      }
    }, 100);
  }

  function startTimer(seconds) {
    roundDuration = seconds;
    timeLeft = seconds;
    onTimerTick(timeLeft, roundDuration);
    armTimerInterval();
  }

  // Durdur sırasında sadece interval durur, timeLeft/roundDuration korunur — Tekrar
  // Çal'da kaldığı saniyeden devam eder.
  function resumeTimer() {
    if (timeLeft <= 0) return;
    onTimerTick(timeLeft, roundDuration);
    armTimerInterval();
  }

  function clearAutoAdvance() {
    clearTimeout(autoAdvanceTimer);
    clearInterval(autoCountdownTimer);
    autoAdvanceTimer = null;
  }

  // Bekleyen bir otomatik-geçiş varsa kalan süresini (ms) döndürür ve zamanlayıcıları
  // iptal eder; yoksa null döner. pauseRound() bunu "Tekrar Çal"da aynı süreyle
  // yeniden kurmak için saklar.
  function captureRemainingAndClear() {
    let remaining = null;
    if (autoAdvanceTimer) {
      remaining = Math.max(0, autoAdvanceSegmentMs - (Date.now() - autoAdvanceArmedAt));
    }
    clearAutoAdvance();
    return remaining;
  }

  // Cevap verildikten sonra bir sonraki soruya otomatik geçişi kurar. label
  // artık KULLANILMIYOR (G142 — kullanıcının kendi kararı: alt bar HİÇBİR
  // zaman geri sayım sayısı göstermesin, "Atla (5) ▶" yerine SADECE "Atla ▶").
  // Parametre SİLİNMEDİ (app.js hâlâ "Atla" geçiyor, G139'un deseni) — İMZA
  // değişmedi, sadece BURADA artık okunmuyor. Otomatik geçişin KENDİSİ
  // (autoAdvanceTimer/setTimeout, zamanlama, onAdvance() tetiklenmesi)
  // BİREBİR AYNI kaldı — SADECE metin artık değişmediği için onu HER 200ms'de
  // yeniden yazan autoCountdownTimer/setInterval'a GEREK KALMADI (aynı sabit
  // string'i saniyede 5 kez DOM'a yazmak gereksizdi), kaldırıldı. clearAutoAdvance()
  // hâlâ `clearInterval(autoCountdownTimer)` çağırıyor — autoCountdownTimer artık
  // hep null, bu çağrı zararsız no-op (captureRemainingAndClear'ın kullandığı
  // autoAdvanceTimer/autoAdvanceArmedAt/autoAdvanceSegmentMs'e DOKUNULMADI).
  function ensureAutoNext(durationMs, label) {
    clearAutoAdvance();

    const total = typeof durationMs === "number" && durationMs > 0 ? durationMs : 1500;
    autoAdvanceArmedAt = Date.now();
    autoAdvanceSegmentMs = total;

    onAutoAdvanceLabel("Atla ▶");

    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null;
      onAutoAdvanceLabel("Atla ▶");
      onAdvance();
    }, total);
  }

  function stopAll() {
    clearTimer();
    clearAutoAdvance();
  }

  return {
    startTimer,
    resumeTimer,
    clearTimer,
    ensureAutoNext,
    clearAutoAdvance,
    captureRemainingAndClear,
    stopAll,
    get timeLeft() { return timeLeft; },
    set timeLeft(v) { timeLeft = v; },
    get roundDuration() { return roundDuration; }
  };
}

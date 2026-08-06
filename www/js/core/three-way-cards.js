// Motor 2 (Kompresör/Reverb) ortak cevap-kartı görseli — G41, Dizayn/prototype.html'in
// .opt/.opt-key/.wave yapısından taşındı (büyük A/B/C kartları: harf + isim + waveform
// + durum metni, alt alta). kompresor.js/reverb.js'in renderAnswerChoices/
// markAnswerChoices'ı SADECE bu üç fonksiyona delege eder — q.choices/q.variants şekli
// (letter/id/tr) ikisinde de BİREBİR aynı, gerçek bir mod-özel fark YOK (G35'in
// submitThreeWayGuess'i app.js'te genelleştirme kararının AYNI felsefesi). Üçüncü bir
// Motor 2 modu eklenirse SADECE bu üç fonksiyonu import edip re-export etmesi yeter.
//
// .ans/.answers class'ları KORUNDU (app.js'in click-delegasyonu ve markAnswerChoices'ın
// querySelectorAll(".ans")'ı bunlara bakıyor) — SADECE görsel bir modifier class'ı
// (.ans-m2/.answers-m2) eklendi, Motor 1 modlarının küçük 3'lü ızgarası ETKİLENMEDİ.

const OPT_NAMES = { A: "Birinci ses", B: "İkinci ses", C: "Üçüncü ses" };

// Sesten bağımsız, SABİT süsleme barları — harfe göre deterministik (rastgele DEĞİL,
// aynı harf her turda aynı örüntüyü çizer, tur değişince "titremesin" diye). Gerçek bir
// amplitüd analizi DEĞİL, prototipin sabit WAVES dizisiyle AYNI felsefe.
const WAVE_PATTERNS = {
  A: [14, 22, 11, 26, 18, 9, 24, 15, 20, 12],
  B: [20, 10, 26, 14, 22, 17, 11, 25, 13, 19],
  C: [11, 24, 16, 9, 21, 26, 14, 18, 10, 23]
};

export function renderThreeWayCards(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers answers-m2";
  answersEl.innerHTML = q.choices.map(c => {
    const bars = (WAVE_PATTERNS[c.id] || WAVE_PATTERNS.A).map(h => `<i style="height:${h}px"></i>`).join("");
    const name = OPT_NAMES[c.id] || c.tr;
    return `<button type="button" class="ans ans-m2" data-letter="${c.id}">
      <div class="ans-m2-key">${c.tr}</div>
      <div class="ans-m2-body">
        <div class="ans-m2-head">
          <div class="ans-m2-name">${name}</div>
          <div class="ans-m2-state">Henüz dinlenmedi</div>
        </div>
        <div class="ans-m2-wave">${bars}</div>
      </div>
    </button>`;
  }).join("");
}

export function markThreeWayCards(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedLetter = picked && typeof picked === "object" ? picked.id : picked;
  const correctLetter = q.variants[q.oddIndex].letter;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(btn => {
    btn.classList.remove("pick", "ans-m2-playing");
    btn.disabled = true;
    const letter = btn.dataset.letter;
    if (letter === correctLetter) btn.classList.add("right");
    else if (letter === pickedLetter) btn.classList.add("wrong");
    // Cevap sonrası renkli kenar (right/wrong) zaten sonucu taşıyor — "Çalınıyor/
    // Henüz dinlenmedi" metni artık anlamsız, temizleniyor.
    const stateEl = btn.querySelector(".ans-m2-state");
    if (stateEl) stateEl.textContent = "";
  });
}

// app.js'in updateAbToggleUI()'si HER threeWayPlayLetter değişiminde (round başlangıcı +
// otomatik döngünün her tık'ı + manuel A/B/C basışı) çağırır — o an çalan kartı
// diğerlerinden ayırt edilir kılar (.ans-m2-playing, bkz. styles.css). Cevap
// verildikten SONRA (btn.disabled) dokunmuyor — markThreeWayCards zaten üzerine yazdı.
export function updateThreeWayCardsPlayState(answersEl, playLetter) {
  if (!answersEl) return;
  Array.from(answersEl.querySelectorAll(".ans-m2")).forEach(btn => {
    if (btn.disabled) return;
    const isPlaying = btn.dataset.letter === playLetter;
    btn.classList.toggle("ans-m2-playing", isPlaying);
    const stateEl = btn.querySelector(".ans-m2-state");
    if (stateEl) stateEl.textContent = isPlaying ? "Çalınıyor" : "Henüz dinlenmedi";
  });
}

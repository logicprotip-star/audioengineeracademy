// Motor 2 (Kompresör/Reverb/Distortion) ortak cevap-kartı görseli.
// G86 DÜZELTMESİ: Tasarim-2026-08/Prototip.dc.html'in isCompMode kart yapısı
// (satır 760-772) birebir — ÖNCEKİ "harf kutusu + Birinci/İkinci/Üçüncü ses +
// Henüz dinlenmedi/Çalınıyor" görünümü SÖKÜLDÜ. Yeni yapı: solda YUVARLAK
// play butonu (kendi click'i, dışarıdaki seçim click'ini durdurur), ortada
// A/B/C etiketi + alt durum metni, sağda dalga + 22x22 seçim işareti.
// Kart artık SEÇER (submitThreeWayGuess'i HEMEN çağırmaz) — gönderim
// ayrı bir onay butonuyla olur (bkz. app.js #freqGuessArea / kompresor.js
// renderGuessAreaControls). .ans/.answers class'ları KORUNDU (app.js'in
// click-delegasyonu ve markAnswerChoices'ın querySelectorAll(".ans")'ı
// bunlara bakıyor).

const OPT_NAMES = { A: "A", B: "B", C: "C" };

// Sesten bağımsız, SABİT süsleme barları — harfe göre deterministik.
// Tasarımın neutralWave() ile AYNI felsefe (16 bar, sabit yükseklik dizisi) —
// burada mevcut 10-barlık dizi KORUNDU (görsel amaçlı, gerçek analiz değil).
const WAVE_PATTERNS = {
  A: [14, 22, 11, 26, 18, 9, 24, 15, 20, 12],
  B: [20, 10, 26, 14, 22, 17, 11, 25, 13, 19],
  C: [11, 24, 16, 9, 21, 26, 14, 18, 10, 23]
};

const PLAY_ICON = `<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px"><path d="M7 4.8v14.4c0 .9 1 1.5 1.8 1L20 13c.8-.5.8-1.6 0-2.1L8.8 3.8C8 3.3 7 3.9 7 4.8Z"></path></svg>`;
const PAUSE_ICON = `<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.5" height="14" rx="1.5"></rect><rect x="13.5" y="5" width="4.5" height="14" rx="1.5"></rect></svg>`;
const CHECK_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#06230e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"></path></svg>`;

export function renderThreeWayCards(answersEl, q) {
  if (!answersEl) return;
  if (!q.choices) { answersEl.innerHTML = ""; answersEl.classList.add("hidden"); return; }
  answersEl.className = "answers answers-m2";
  answersEl.innerHTML = q.choices.map(c => {
    const bars = (WAVE_PATTERNS[c.id] || WAVE_PATTERNS.A).map(h => `<i style="height:${h}px"></i>`).join("");
    const name = OPT_NAMES[c.id] || c.tr;
    return `<div class="ans ans-m2" data-letter="${c.id}">
      <button type="button" class="ans-m2-play" data-letter="${c.id}" aria-label="${name} dinle">${PLAY_ICON}</button>
      <div class="ans-m2-body">
        <div class="ans-m2-name">${name}</div>
        <div class="ans-m2-state">dinlemek için bas</div>
      </div>
      <div class="ans-m2-wave">${bars}</div>
      <div class="ans-m2-dot"></div>
    </div>`;
  }).join("");
}

// G86 YENİ — kart SEÇİMİ (henüz gönderim DEĞİL). app.js click-delegasyonu
// (.ans-m2 gövdesine tıklanınca, play butonu HARİÇ) bunu çağırır.
export function selectThreeWayCard(answersEl, letter) {
  if (!answersEl) return;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(card => {
    const on = card.dataset.letter === letter;
    card.classList.toggle("selected", on);
    const dot = card.querySelector(".ans-m2-dot");
    if (dot) dot.innerHTML = on ? CHECK_ICON : "";
  });
}

export function markThreeWayCards(answersEl, q, picked) {
  if (!answersEl || !q.choices) return;
  const pickedLetter = picked && typeof picked === "object" ? picked.id : picked;
  const correctLetter = q.variants[q.oddIndex].letter;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(card => {
    card.classList.remove("selected", "ans-m2-playing");
    card.classList.add("ans-m2-disabled");
    const letter = card.dataset.letter;
    if (letter === correctLetter) card.classList.add("right");
    else if (letter === pickedLetter) card.classList.add("wrong");
    // Cevap sonrası renkli kenar (right/wrong) zaten sonucu taşıyor — "Çalıyor/
    // dinlemek için bas" metni artık anlamsız, temizleniyor.
    const stateEl = card.querySelector(".ans-m2-state");
    if (stateEl) stateEl.textContent = "";
    const playBtn = card.querySelector(".ans-m2-play");
    if (playBtn) playBtn.disabled = true;
  });
}

// app.js'in updateAbToggleUI()'si HER threeWayPlayLetter değişiminde (round başlangıcı +
// otomatik döngünün her tık'ı + manuel A/B/C basışı + kart play butonu) çağırır — o an
// çalan kartı diğerlerinden ayırt edilir kılar. Cevap verildikten SONRA (ans-m2-disabled)
// dokunmuyor — markThreeWayCards zaten üzerine yazdı.
export function updateThreeWayCardsPlayState(answersEl, playLetter) {
  if (!answersEl) return;
  Array.from(answersEl.querySelectorAll(".ans")).forEach(card => {
    if (card.classList.contains("ans-m2-disabled")) return;
    const isPlaying = card.dataset.letter === playLetter;
    card.classList.toggle("ans-m2-playing", isPlaying);
    const stateEl = card.querySelector(".ans-m2-state");
    if (stateEl) stateEl.textContent = isPlaying ? "çalıyor" : "dinlemek için bas";
    const playBtn = card.querySelector(".ans-m2-play");
    if (playBtn) playBtn.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
  });
}

// Genel görsel geri bildirim efektleri (toast, uçan XP, parçacık patlaması, sallanma).
// Mod-bağımsız; sadece DOM'a dokunur.
import { randomBetween } from "./utils.js";

// F3: aynı anda birden fazla toast (ör. günlük görev + başarım) tetiklenirse
// eskiden hepsi AYNI sabit konumda birbirinin üzerine biniyordu. Şimdi görünür
// toast'ların yüksekliği toplanarak her yeni toast bir öncekinin ALTINA
// diziliyor (üst üste binme yok) — bir toast kaybolunca kalanlar yukarı
// kayarak boşluğu dolduruyor.
const activeToasts = [];

// Oyun ekranında (#screen-game) .ghead sabit/scroll-dışı bir üst bar — içinde
// geri/ayarlar butonları var. Toast'lar sadece üstten güvenli bir boşlukla
// değil, bu barın GERÇEK yüksekliği kadar aşağıdan başlamalı — aksi halde
// oyun sırasında (en sık toast tetiklenen an) üst bardaki dokunulabilir
// butonların üzerine biner. Diğer ekranlarda .ghead görünmez (display:none →
// yükseklik 0), o zaman sade bir güvenli üst boşluk kullanılır.
function toastBaseTop() {
  const ghead = document.querySelector("#screen-game .ghead");
  const gheadH = ghead ? ghead.getBoundingClientRect().height : 0;
  return gheadH > 0 ? gheadH + 10 : 12;
}

function relayoutToasts() {
  let offset = toastBaseTop();
  activeToasts.forEach(el => {
    el.style.top = `calc(env(safe-area-inset-top) + ${offset}px)`;
    offset += el.offsetHeight + 10;
  });
}

export function toast(title, desc) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${title}</b><small>${desc}</small>`;
  document.body.appendChild(el);
  activeToasts.push(el);
  relayoutToasts();
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
    el.style.transition = ".3s ease";
  }, 2400);
  setTimeout(() => {
    el.remove();
    const idx = activeToasts.indexOf(el);
    if (idx !== -1) activeToasts.splice(idx, 1);
    relayoutToasts();
  }, 2800);
}

// F3: eskiden anchor'ın (spektrum canvas) ÜST kenarından başlayıp 90px yukarı
// süzülüyordu (bkz. styles.css floatUp) — bu da canvas'ın hemen üstündeki soru
// metninin üzerine biniyordu. Başlangıç noktası artık anchor'ın DÜŞEY ORTASI —
// 90px'lik yukarı süzülme canvas'ın kendi sınırları içinde kalır, soru metnine
// ulaşmaz.
export function spawnXp(text, anchor) {
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "floating-xp";
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2 + window.scrollY}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1450);
}

export function burst(anchor) {
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

export function shake(node) {
  node.animate([
    { transform: "translateX(0)" },
    { transform: "translateX(-8px)" },
    { transform: "translateX(8px)" },
    { transform: "translateX(-5px)" },
    { transform: "translateX(0)" }
  ], { duration: 360, easing: "ease-out" });
}

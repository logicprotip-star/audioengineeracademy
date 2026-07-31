// Genel görsel geri bildirim efektleri (toast, uçan XP, parçacık patlaması, sallanma).
// Mod-bağımsız; sadece DOM'a dokunur.
import { randomBetween } from "./utils.js";

export function toast(title, desc) {
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

export function spawnXp(text, anchor) {
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "floating-xp";
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + window.scrollY - 6}px`;
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

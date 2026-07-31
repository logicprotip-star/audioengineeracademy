// Genel amaçlı, DOM/ses bağımsız yardımcı fonksiyonlar. Saf fonksiyonlardır.

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function logFreq(min, max) {
  const a = Math.log(min);
  const b = Math.log(max);
  return Math.exp(randomBetween(a, b));
}

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function formatHz(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)} kHz`;
  return `${Math.round(v)} Hz`;
}

export function hexToRgba(hex, alpha) {
  const v = hex.replace("#", "");
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

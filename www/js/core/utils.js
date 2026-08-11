// Genel amaçlı, DOM/ses bağımsız yardımcı fonksiyonlar. Saf fonksiyonlardır.

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// ⚠️ KULLANILMIYOR (kod dayanıklılık taraması, ölü kod maddesi) — hiçbir
// yerden import edilmiyor (www/js ve test/ genelinde grep ile doğrulandı).
// Silinmedi, sadece işaretlendi.
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

// ⚠️ KULLANILMIYOR (kod dayanıklılık taraması) — www/js içinde çağrılmıyor
// (styles.css/app.js kendi renk sabitlerini/rgba() literallerini kullanıyor).
// Silinmedi, sadece işaretlendi.
export function hexToRgba(hex, alpha) {
  const v = hex.replace("#", "");
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Türkçe bulunma hâli eki ('de/'da/'te/'ta), sayının YAZIYLA okunuşunun son harfine
// göre (ünlü uyumu + ünsüz sertleşmesi/devoicing). 1-20 arası tanımlı — uygulamanın
// gerçekte kullandığı unlockLevel aralığı budur. Tablo dışı bir sayı gelirse
// SESSİZCE yanlış ek üretmek yerine hata fırlatır (bkz. çağıran taraf bunu
// beklenmedik/tanımsız bir seviye olarak ele almalı).
const TURKISH_LOCATIVE_SUFFIX = {
  1: "de", 2: "de", 3: "te", 4: "te", 5: "te", 6: "da", 7: "de", 8: "de", 9: "da", 10: "da",
  11: "de", 12: "de", 13: "te", 14: "te", 15: "te", 16: "da", 17: "de", 18: "de", 19: "da", 20: "de"
};
export function turkishLocative(n) {
  const suffix = TURKISH_LOCATIVE_SUFFIX[n];
  if (!suffix) throw new Error(`turkishLocative: ${n} için tanımlı ek yok (1-20 aralığı dışında)`);
  return `${n}'${suffix}`;
}

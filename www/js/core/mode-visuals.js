// Ana ekran mod kartlarının SVG görselleri — Tasarim-2026-08/Ana Ekran.dc.html'in
// vizSvg(kind) üretecinden (React.createElement tabanlı) BİREBİR taşındı, sadece
// çıktı biçimi değişti: React elementi DEĞİL, doğrudan innerHTML'e basılabilen bir
// SVG string'i (bu uygulama React kullanmıyor, düz DOM/innerHTML ile çalışıyor).
// Koordinatlar/renkler/metinler TASARIM DOSYASINDAN AYNEN kopyalandı — burada
// SAYI UYDURULMADI. Saf fonksiyonlar: DOM'a dokunmaz, sadece string döndürür.
//
// "kind" tasarımdaki isimlendirmeyle AYNI (bell/cut/q/boostcut/comp/db/reverb/
// tonal/dist/mask) ama dışa açılan asıl API gerçek mod ID'sine göre (bkz.
// MODE_VIZ_KIND + modeVisualSvg) — çağıran taraf (app.js) "kind" string'iyle
// UĞRAŞMAZ, mode.getMeta().id'yi bilir.

const CYAN = "#22d3ee";
const CYAN_DIM = "rgba(34,211,238,0.22)";
const AMBER = "#f0b442";
const GRID_W = 200, GRID_H = 84;

function gridLines() {
  let out = "";
  for (let x = 20; x < GRID_W; x += 20) out += `<line x1="${x}" y1="0" x2="${x}" y2="${GRID_H}" stroke="rgba(255,255,255,0.045)" stroke-width="1"/>`;
  for (let y = 14; y < GRID_H; y += 14) out += `<line x1="0" y1="${y}" x2="${GRID_W}" y2="${y}" stroke="rgba(255,255,255,0.045)" stroke-width="1"/>`;
  return out;
}

function bellBody(gradId) {
  const d = "M0,64 C50,64 62,64 78,60 C92,56 96,20 100,20 C104,20 108,56 122,60 C138,64 150,64 200,64";
  return `
    <path d="${d} L200,84 L0,84 Z" fill="url(#${gradId})"/>
    <path d="${d}" fill="none" stroke="${CYAN}" stroke-width="2"/>
    <line x1="100" y1="14" x2="100" y2="78" stroke="rgba(34,211,238,0.5)" stroke-width="1" stroke-dasharray="3 3"/>
    <circle cx="100" cy="20" r="3.5" fill="${CYAN}"/>
    <text x="100" y="11" text-anchor="middle" font-size="8" font-family="Inter" font-weight="600" fill="#7cd8e8">+6 dB · 2.5k</text>`;
}

function cutBody() {
  let bars = "";
  for (let i = 0; i < 30; i++) {
    const x = 8 + i * 6.4;
    const hgt = 5 + Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.31)) * 26;
    const after = x > 118;
    bars += `<rect x="${x}" y="${42 - hgt}" width="3.6" height="${hgt * 2}" rx="1.8" fill="${after ? "rgba(90,96,104,0.35)" : CYAN}" opacity="${after ? 1 : 0.85}"/>`;
  }
  return `
    ${bars}
    <line x1="118" y1="6" x2="118" y2="78" stroke="${AMBER}" stroke-width="1.5" stroke-dasharray="5 3"/>
    <text x="122" y="14" font-size="8" font-family="Inter" font-weight="600" fill="${AMBER}">kesim</text>`;
}

function qBody(gradId) {
  const wide = "M10,66 C50,64 60,30 100,30 C140,30 150,64 190,66";
  const narrow = "M55,66 C80,64 88,18 100,18 C112,18 120,64 145,66";
  return `
    <path d="${wide}" fill="none" stroke="#5a6068" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="${narrow} L145,84 L55,84 Z" fill="url(#${gradId})"/>
    <path d="${narrow}" fill="none" stroke="${CYAN}" stroke-width="2"/>
    <line x1="72" y1="44" x2="128" y2="44" stroke="#7cd8e8" stroke-width="1.2"/>
    <text x="100" y="40" text-anchor="middle" font-size="9" font-family="Inter" font-weight="700" fill="#7cd8e8">Q</text>`;
}

function boostcutBody() {
  const up = "M10,44 C40,44 52,44 64,40 C74,36 76,20 80,20 C84,20 86,36 96,40 C108,44 120,44 130,44";
  const dn = "M70,44 C100,44 112,44 124,48 C134,52 136,66 140,66 C144,66 146,52 156,48 C168,44 180,44 190,44";
  return `
    <path d="${up}" fill="none" stroke="#4ade80" stroke-width="2"/>
    <path d="${dn}" fill="none" stroke="#f87160" stroke-width="2"/>
    <line x1="0" y1="44" x2="200" y2="44" stroke="rgba(255,255,255,0.14)" stroke-width="1" stroke-dasharray="2 3"/>
    <text x="80" y="13" text-anchor="middle" font-size="8" font-family="Inter" font-weight="700" fill="#4ade80">BOOST</text>
    <text x="140" y="79" text-anchor="middle" font-size="8" font-family="Inter" font-weight="700" fill="#f87160">CUT</text>`;
}

function compBody() {
  return `
    <line x1="14" y1="76" x2="108" y2="12" stroke="#5a6068" stroke-width="1.3" stroke-dasharray="4 3"/>
    <path d="M14,76 L72,36 C80,30 88,28 100,26 L186,16" fill="none" stroke="${CYAN}" stroke-width="2"/>
    <circle cx="72" cy="36" r="3.5" fill="${CYAN}"/>
    <text x="80" y="50" font-size="8" font-family="Inter" font-weight="600" fill="#7cd8e8">knee · 4:1</text>
    <text x="186" y="79" text-anchor="end" font-size="7" font-family="Inter" fill="#4a4f56">IN dB</text>
    <text x="8" y="12" font-size="7" font-family="Inter" fill="#4a4f56">OUT</text>`;
}

function dbBody() {
  let ticks = "";
  ["+12", "+6", "0", "-6", "-12"].forEach((l, i) => {
    const y = 12 + i * 15;
    ticks += `<line x1="92" y1="${y}" x2="108" y2="${y}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`;
    ticks += `<text x="116" y="${y + 3}" font-size="8" font-family="Inter" font-weight="500" fill="#6c7178">${l}</text>`;
  });
  return `
    <rect x="97" y="10" width="6" height="64" rx="3" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    ${ticks}
    <rect x="97" y="22" width="6" height="52" rx="3" fill="${CYAN_DIM}"/>
    <rect x="84" y="16" width="32" height="13" rx="4" fill="#2a2d31" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
    <rect x="84" y="21.5" width="32" height="2" fill="${CYAN}"/>
    <text x="62" y="26" text-anchor="end" font-size="9" font-family="Inter" font-weight="700" fill="#7cd8e8">+4 dB?</text>`;
}

function reverbBody() {
  let bars = "";
  for (let i = 0; i < 16; i++) {
    const x = 22 + i * 10.5;
    const hgt = 30 * Math.exp(-i * 0.24);
    bars += `<rect x="${x}" y="${46 - hgt}" width="5" height="${hgt * 2}" rx="2.5" fill="${CYAN}" opacity="${Math.max(0.12, 1 - i * 0.07)}"/>`;
  }
  return `
    <rect x="8" y="12" width="7" height="68" rx="3.5" fill="${CYAN}"/>
    ${bars}
    <text x="100" y="12" text-anchor="middle" font-size="8" font-family="Inter" font-weight="600" fill="#7cd8e8">decay 1.8 s</text>`;
}

function tonalBody(gradId) {
  const flat = "M10,46 C60,44 140,44 190,42";
  const tilt = "M10,60 C60,52 120,36 190,24";
  return `
    <path d="${flat}" fill="none" stroke="#5a6068" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="${tilt} L190,84 L10,84 Z" fill="url(#${gradId})"/>
    <path d="${tilt}" fill="none" stroke="${CYAN}" stroke-width="2"/>
    <text x="14" y="76" font-size="7" font-family="Inter" fill="#4a4f56">karanlık</text>
    <text x="186" y="16" text-anchor="end" font-size="7" font-family="Inter" fill="#4a4f56">parlak</text>`;
}

function distBody() {
  let dClean = "M10,42", dClip = "M10,42";
  for (let i = 0; i <= 90; i++) {
    const x = 10 + i * 2;
    const v = Math.sin(i / 7.2) * 30;
    dClean += ` L${x},${42 - v}`;
    dClip += ` L${x},${42 - Math.max(-16, Math.min(16, v * 1.6))}`;
  }
  return `
    <path d="${dClean}" fill="none" stroke="#5a6068" stroke-width="1.3" stroke-dasharray="3 3"/>
    <path d="${dClip}" fill="none" stroke="${AMBER}" stroke-width="2"/>
    <line x1="10" y1="26" x2="190" y2="26" stroke="rgba(248,113,96,0.5)" stroke-width="1" stroke-dasharray="2 3"/>
    <line x1="10" y1="58" x2="190" y2="58" stroke="rgba(248,113,96,0.5)" stroke-width="1" stroke-dasharray="2 3"/>
    <text x="100" y="14" text-anchor="middle" font-size="8" font-family="Inter" font-weight="600" fill="${AMBER}">clip</text>`;
}

function maskBody() {
  const kick = "M10,72 C30,26 44,20 58,30 C74,44 90,64 120,70 C150,74 170,76 190,77";
  const bass = "M10,76 C40,72 52,50 74,38 C92,28 108,32 124,46 C142,62 165,72 190,74";
  return `
    <path d="${kick} L190,84 L10,84 Z" fill="rgba(34,211,238,0.15)"/>
    <path d="${bass} L190,84 L10,84 Z" fill="rgba(240,180,66,0.13)"/>
    <path d="${kick}" fill="none" stroke="${CYAN}" stroke-width="1.8"/>
    <path d="${bass}" fill="none" stroke="${AMBER}" stroke-width="1.8"/>
    <rect x="52" y="26" width="46" height="58" fill="rgba(255,80,80,0.08)"/>
    <text x="14" y="16" font-size="8" font-family="Inter" font-weight="700" fill="${CYAN}">KICK</text>
    <text x="162" y="16" font-size="8" font-family="Inter" font-weight="700" fill="${AMBER}">BAS</text>`;
}

const BODY_BY_KIND = {
  bell: bellBody, cut: cutBody, q: qBody, boostcut: boostcutBody, comp: compBody,
  db: dbBody, reverb: reverbBody, tonal: tonalBody, dist: distBody, mask: maskBody
};

// Gerçek mod ID'si → tasarımdaki "kind" adı (bkz. dosya başı notu).
export const MODE_VIZ_KIND = {
  "frekans-bulma": "bell",
  "kesim-noktasi": "cut",
  "q-genisligi": "q",
  "boost-mu-cut-mu": "boostcut",
  kompresor: "comp",
  "db-seviyesi": "db",
  reverb: "reverb",
  "tonal-denge": "tonal",
  distortion: "dist",
  "frekans-cakismasi": "mask"
};

// SAF FONKSİYON — kayıtlı olmayan bir modId için null döner (çağıran taraf
// görselsiz bir kart göstermek zorunda KALMAZ, ama uydurma bir "kind" de
// ÜRETİLMEZ). gradId modId'den türetilir — 10 kart AYNI anda DOM'dayken
// hepsi "gB" id'sini paylaşırsa (tasarım dosyasındaki tek-SVG-önizleme
// varsayımı burada geçerli DEĞİL) yinelenen id geçersiz HTML olur ve
// url(#gB) sadece İLKİNE bağlanır — her kart kendi benzersiz gradyan
// id'sini taşır.
export function modeVisualSvg(modeId) {
  const kind = MODE_VIZ_KIND[modeId];
  const bodyFn = kind && BODY_BY_KIND[kind];
  if (!bodyFn) return null;
  const gradId = `modeviz-grad-${modeId}`;
  return `<svg width="100%" height="100%" viewBox="0 0 ${GRID_W} ${GRID_H}" preserveAspectRatio="none" style="display:block">` +
    `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="rgba(34,211,238,0.35)"/><stop offset="1" stop-color="rgba(34,211,238,0)"/>` +
    `</linearGradient></defs>${gridLines()}${bodyFn(gradId)}</svg>`;
}

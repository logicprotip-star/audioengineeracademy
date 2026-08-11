// Seviye bilgi sayfasının (app.js: renderLevelSheet) mod-başına TERMİNOLOJİSİ
// — TEK YERDE, düzenli. Sorun: renderLevelSheet ÖNCEDEN core/difficulty-curve.js:
// difficultyParams()'ın JENERİK gainDb/Q'sünü (Frekans Bulma'nın KENDİ dili)
// TÜM 10 modda gösteriyordu — mix mühendisi Kompresör'de "Bant genişliği"
// görünce yanlış bulur (Kompresör'ün bant genişliğiyle hiçbir ilgisi yok).
//
// Her mod artık KENDİ paramsForDifficultyPosition(level)'ını (HER modda AYNI
// imza — "position"/level girdisi, bkz. o fonksiyonların kendi dosya başı
// notları, ör. kompresor.js: "diğer beş modun paramsForDifficultyPosition'ıyla
// AYNI mod-agnostik girdi") okuyor — bu dosya SADECE o çıktının MOD-SPESİFİK
// alanlarını (gainDb/q/marginOct/kGap/dbDelta/vb.) DOĞRU etikete/birime
// çeviren küçük bir sözlük.
//
// ÇEVİRİYE ZEMİN — i18n DEĞİL: ileride çeviri gelince SADECE bu dosyadaki
// label string'leri değişir, app.js'e ya da mod dosyalarına HİÇ dokunulmaz.
// i18n altyapısı (dil seçimi/locale dosyaları/vb.) BİLEREK KURULMADI — bu
// SADECE Türkçe metinlerin dağınık kod yerine tek bir yapıda tutulması.
//
// kGap (Kompresör/Reverb/Distortion — bkz. o üçünün TEK ortak alanı) BİLEREK
// bir fiziksel birime (dB/saniye) ÇEVRİLMEDİ: bu üçünün gerçek fiziksel farkı
// (gainReductionDb/decayAtK/driveAtK) HER TURDA rastgele seçilen bir TÜRE
// (Kompresör hariç — Reverb'in Room/Hall/Plate'i, Distortion'ın clip/soft/
// tube/tape'i) bağlı, aralıkları birbirinden ÇOK farklı (ör. Reverb'in decay
// aralığı Room'da 0.3-0.9sn, Hall'da 1.6-3.2sn) — seviye sayfası için
// "temsili" bir tür SEÇMEK yanıltıcı olurdu (görüntülenen sayı bazı turlarda
// doğru, bazılarında yanlış görünürdü). kGap [0,1] uzayında TÜRDEN bağımsız,
// dürüst bir yüzde olarak gösteriliyor — hangi türe çevrileceğinden bağımsız
// gerçek zorluk sinyali (bkz. o modların kendi CURVE_CONFIG yorumları).
import { formatOctaveBandwidth, qToOctaveBandwidth } from "./difficulty-curve.js";

function formatPercent(k) {
  return `%${Math.round(k * 100)}`;
}
function formatDb(db) {
  return `${db.toFixed(1)} dB`;
}

export const LEVEL_SHEET_TERMS = {
  "frekans-bulma": {
    sensitivityLabel: "Bant genişliği",
    amountLabel: "Frekans artışı",
    formatSensitivity: p => formatOctaveBandwidth(qToOctaveBandwidth(p.q)),
    formatAmount: p => formatDb(p.gainDb)
  },
  "kesim-noktasi": {
    sensitivityLabel: "Kesim frekansı marjı",
    amountLabel: null,
    formatSensitivity: p => formatOctaveBandwidth(p.marginOct),
    formatAmount: () => null
  },
  "q-genisligi": {
    sensitivityLabel: "Q ayrımı",
    amountLabel: null,
    formatSensitivity: p => p.edgeMargin.toFixed(2),
    formatAmount: () => null
  },
  "boost-mu-cut-mu": {
    sensitivityLabel: "Boost/Cut miktarı",
    amountLabel: "Şıklar arası aralık",
    formatSensitivity: p => formatDb(p.gainDb),
    formatAmount: p => formatDb(p.gainStepDb)
  },
  "db-seviyesi": {
    sensitivityLabel: "Seviye farkı",
    amountLabel: "Şıklar arası aralık",
    formatSensitivity: p => formatDb(p.dbDelta),
    formatAmount: p => formatDb(p.step)
  },
  kompresor: {
    sensitivityLabel: "Ratio ayrımı",
    amountLabel: null,
    formatSensitivity: p => formatPercent(p.kGap),
    formatAmount: () => null
  },
  reverb: {
    sensitivityLabel: "Reverb ayrımı",
    amountLabel: null,
    formatSensitivity: p => formatPercent(p.kGap),
    formatAmount: () => null
  },
  "tonal-denge": {
    sensitivityLabel: "Tonal sapma",
    amountLabel: null,
    formatSensitivity: p => formatDb(p.disturbDb),
    formatAmount: () => null
  },
  "frekans-cakismasi": {
    sensitivityLabel: "Çakışma bölgesi genişliği",
    amountLabel: "Kesim adımı",
    formatSensitivity: p => formatOctaveBandwidth(p.regionWidthOct),
    formatAmount: p => formatDb(p.cutStepDb)
  },
  distortion: {
    sensitivityLabel: "Saturation ayrımı",
    amountLabel: null,
    formatSensitivity: p => formatPercent(p.kGap),
    formatAmount: () => null
  },
  // Pan Konumu/Stereo Genişlik'in eğrisi diğerlerinden FARKLI bir eksen
  // kullanıyor (bkz. o modların dosya başı notu): tek bilinmeyen, ızgaranın
  // KADEME SAYISI (3→7) — kolayda az/uzak kademe, zorda çok/yakın kademe.
  // "amount" burada kademeler arası ORTALAMA aralık (%), sensitivityLabel'in
  // DOĞAL sonucu — ayrı bir ikinci eksen DEĞİL, aynı sayının başka görünümü.
  "pan-konumu": {
    sensitivityLabel: "Izgara kademesi",
    amountLabel: "Kademeler arası aralık",
    formatSensitivity: p => `${p.steps} kademe`,
    formatAmount: p => `%${Math.round(200 / (p.steps - 1))}`
  },
  "stereo-genislik": {
    sensitivityLabel: "Izgara kademesi",
    amountLabel: "Kademeler arası aralık",
    formatSensitivity: p => `${p.steps} kademe`,
    formatAmount: p => `%${Math.round(100 / (p.steps - 1))}`
  }
};

// Güvenlik ağı — kayıtlı olmayan/gelecekte eklenecek bir modId için (asla
// olmamalı, 10 mod da yukarıda) sessizce çökmek yerine jenerik bir etiket.
export const DEFAULT_LEVEL_SHEET_TERMS = {
  sensitivityLabel: "Hassasiyet",
  amountLabel: null,
  formatSensitivity: () => "—",
  formatAmount: () => null
};

export function levelSheetTermsFor(modeId) {
  return LEVEL_SHEET_TERMS[modeId] || DEFAULT_LEVEL_SHEET_TERMS;
}

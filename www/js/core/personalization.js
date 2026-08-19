// ZORLUK MİMARİSİ (Z4) — kişiselleştirme: bölge bazlı isabet oranı + ortalama sapmadan
// bir "zayıflık skoru" üretir, soru üretiminde zayıf bölgelerin seçilme olasılığını
// artırır. SAF fonksiyonlar — ses/DOM'a dokunmaz, zoneStats/zones/range'i PARAMETRE
// olarak alır (FA_ZONES'u DOĞRUDAN import ETMEZ — mode-agnostic kalır, frekans-bulma.js
// kendi FA_ZONES'unu geçirir).
//
// TÜM SAYISAL DEĞERLER BURADA — sabah kulakla/oranla ayarlanabilsin.
export const PERSONALIZATION_CONFIG = {
  // Bu eşiğin ALTINDA bölge "yeterli veri yok" sayılır — nötr (eşit) ağırlık alır.
  // Yeni kullanıcı (hiçbir bölgede yeterli veri yok) tamamen EŞİT dağılıma düşer.
  //
  // G319 (OLCUM-ZAYIF-KADEME-19-08) — 3'TEN 10'A YÜKSELTİLDİ, exam-system.js
  // MIN_TIER_SAMPLES'ın AYNI gerekçesi/simülasyonu (bkz. o dosyanın notu) —
  // zoneWeakness'ın ACCURACY_WEIGHT'i (0.6, aşağıda) baskın bileşen olduğu
  // için AYNI n=10 eşiği burada da uygulandı. Bu, deviation bileşenini
  // (DEVIATION_WEIGHT: 0.4) AYRICA simüle eden bağımsız bir ölçüm DEĞİL —
  // accuracy-ağırlıklı benzetme, dürüstçe işaretleniyor.
  MIN_SAMPLES: 10,

  // AGRESİFLİK SINIRI (Z4'ün kendi istediği): en zayıf bölge (weakness=1) en güçlü
  // bölgeye (weakness=0, ağırlık=1) göre en fazla (1+MAX_BOOST)/1 = 3x ağırlık alır —
  // yani en kötü senaryoda bile güçlü bölgeler HÂLÂ ~%25 ihtimalle gelmeye devam eder
  // (2 bölgeli basit bir örnekte 1:3 oranı ~%25/%75'e denk gelir). Kullanıcı SADECE
  // zayıf bölgeyle boğulmaz.
  MAX_BOOST: 2.0,

  // Ortalama sapmayı (oktav) 0..1'e normalize ederken referans nokta — evaluateAnswer'ın
  // "doğru" kabul sınırıyla (0.5 oktav) AYNI, iki farklı sinyal (doğruluk + sapma
  // büyüklüğü) aynı ölçekte karşılaştırılabilsin diye.
  DEVIATION_REFERENCE_OCT: 0.5,

  // Zayıflık skoru = ACCURACY_WEIGHT*(1-doğruluk) + DEVIATION_WEIGHT*normalizeSapma.
  // Toplamı 1 olacak şekilde seçildi; doğruluk biraz daha ağır basıyor (yanlış cevap
  // vermek, doğru cevaba yakın ıskalamaktan daha güçlü bir "zayıflık" sinyali).
  ACCURACY_WEIGHT: 0.6,
  DEVIATION_WEIGHT: 0.4
};

// SAF FONKSİYON. zoneStat: { n, ok, sumDOct, dOctCount } (bkz. frekans-bulma.js
// recordZone). Dönen: 0 (çok güçlü) .. 1 (çok zayıf), ya da null (yetersiz veri).
export function zoneWeakness(zoneStat, config = PERSONALIZATION_CONFIG) {
  if (!zoneStat || !(zoneStat.n >= config.MIN_SAMPLES)) return null;
  const acc = zoneStat.n > 0 ? zoneStat.ok / zoneStat.n : 0;
  const avgDOct = zoneStat.dOctCount > 0 ? zoneStat.sumDOct / zoneStat.dOctCount : 0;
  const normDev = Math.min(1, avgDOct / config.DEVIATION_REFERENCE_OCT);
  return config.ACCURACY_WEIGHT * (1 - acc) + config.DEVIATION_WEIGHT * normDev;
}

// SAF FONKSİYON. weakness null (yetersiz veri) → ağırlık 1 (nötr/eşit) — bu, "veri
// yokken eşit dağılım" kuralını sağlıyor.
export function zoneWeight(zoneStat, config = PERSONALIZATION_CONFIG) {
  const w = zoneWeakness(zoneStat, config);
  return w === null ? 1 : 1 + w * config.MAX_BOOST;
}

function zoneKey(zone) {
  return zone.t.split(" (")[0];
}

// G50 — SINAV SİSTEMİNİN 7 moda yayılması: exam-system.js'in getWeakTier()'ıyla
// AYNI ROL ama ZORLUK KADEMESİ yerine FREKANS BÖLGESİ ekseninde — frekans-tabanlı
// modların (Frekans Bulma/Kesim Noktası/Boost-Cut/Q Genişliği) telafi'si HANGİ
// bölgede yoğunlaşacağını belirler. pickPersonalizedZone()'un AKSİNE (ağırlıklı
// RASTGELE seçim, normal soru üretimi için) burada DETERMİNİSTİK en zayıf bölge
// döner — getWeakTier'ın "en düşük doğrulukla kademe" kararının BİREBİR AYNISI,
// telafi rastgele değil GERÇEKTEN en zayıf noktayı hedeflemeli. SAF fonksiyon,
// zones parametre olarak alınır (FA_ZONES'u DOĞRUDAN import ETMEZ — dosya başı
// nottaki mode-agnostic ilke). Dönen: { zone, weakness } ya da hiçbir bölge
// MIN_SAMPLES'a ulaşmamışsa null (yeni kullanıcı — çağıran taraf bu durumda
// bölge daraltmadan/tüm spektrumda telafi yapmalı).
//
// G319 (OLCUM-ZAYIF-KADEME-19-08) — exam-system.js:getWeakTier'ın AYNI eşik
// EKLEMESİ: yeterli örnekli (>=MIN_SAMPLES) bölge SAYISI 2'den azsa null
// dönüyor — DÜZELTME ÖNCESİ tek aday kaldığında o bölge KARŞILAŞTIRMASIZ
// "en zayıf" seçiliyordu. FORMÜLE (zoneWeakness hesabı) DOKUNULMADI.
export function getWeakZone(zoneStats, zones, config = PERSONALIZATION_CONFIG) {
  let weakest = null;
  let qualifyingCount = 0;
  for (const zone of zones || []) {
    const w = zoneWeakness((zoneStats || {})[zoneKey(zone)], config);
    if (w === null) continue;
    qualifyingCount++;
    if (!weakest || w > weakest.weakness) weakest = { zone, weakness: w };
  }
  return qualifyingCount >= 2 ? weakest : null;
}

// SAF FONKSİYON. zones: [{a,b,t}] (FA_ZONES benzeri, çağıran taraftan). range: [min,max]
// — odak aralığı (M1-4) uygulanmışsa SADECE bu aralıkla KESİŞEN bölgeler arasından
// seçilir (aralık dışı bölge hiç gelmez — "odak aralığı içinde çalışsın" kararı).
// rng: test edilebilirlik için enjekte edilebilir (varsayılan Math.random).
export function pickPersonalizedZone(zoneStats, zones, range, rng = Math.random) {
  const inRange = zones.filter(z => z.b > range[0] && z.a < range[1]);
  if (inRange.length === 0) return null;
  const weights = inRange.map(z => zoneWeight((zoneStats || {})[zoneKey(z)]));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * total;
  for (let i = 0; i < inRange.length; i++) {
    if (r < weights[i]) return inRange[i];
    r -= weights[i];
  }
  return inRange[inRange.length - 1];
}

// SAF FONKSİYON. Seçilen bölgeyi range ile KESİŞTİRİP [min,max] döndürür — createQuestion
// bu daralmış aralıkla logFreq() çağırarak kişiselleştirilmiş bir frekans üretir. Hiçbir
// bölge range'le kesişmiyorsa (olmamalı ama güvenlik) range'in kendisini döner.
export function personalizedRange(zoneStats, zones, range, rng = Math.random) {
  const zone = pickPersonalizedZone(zoneStats, zones, range, rng);
  if (!zone) return range;
  return [Math.max(range[0], zone.a), Math.min(range[1], zone.b)];
}

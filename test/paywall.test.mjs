// Paywall Parça 1 — kısıtlama MANTIĞI testleri. Satın alma/ekran/reklam YOK
// (bkz. paywall.js dosya başı notu) — burada sadece "isPro true/false iken ne
// olmalı" saf fonksiyonları doğrulanıyor. Tümü Date.now()/localStorage'dan
// BAĞIMSIZ (zaman parametre olarak geçiliyor) — CLAUDE.md'nin saflık şartı.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as paywall from "../www/js/core/paywall.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

describe("paywall: seviye kilidi (G62'de kısmen, G163'te TAMAMEN kaldırıldı)", () => {
  it("ücretsizde (isPro=false) seviye kilidi HER ZAMAN açık — academyLevel unlockLevel'ın ÇOK altında olsa bile", () => {
    assert.equal(paywall.meetsLevelRequirement(false, 1, 12), true); // Kompresör vakası: academyLevel 1, unlockLevel 12
    assert.equal(paywall.meetsLevelRequirement(false, 0, 20), true);
    assert.equal(paywall.meetsLevelRequirement(false, 999, 1), true);
  });

  // G163 — kullanıcı kararı: Pro'da da seviye kilidi kalktı, academyLevel/
  // unlockLevel'a artık HİÇ bakılmıyor — eşiğin ÇOK altında/üstünde olması
  // fark etmiyor, sonuç her zaman true.
  it("Pro'da (isPro=true) da seviye kilidi HER ZAMAN açık — academyLevel unlockLevel'ın altında olsa bile", () => {
    assert.equal(paywall.meetsLevelRequirement(true, 12, 12), true); // tam eşik
    assert.equal(paywall.meetsLevelRequirement(true, 15, 12), true); // eşiği aşmış
    assert.equal(paywall.meetsLevelRequirement(true, 11, 12), true); // eşiğin altında — ARTIK YİNE DE açık
    assert.equal(paywall.meetsLevelRequirement(true, 0, 1), true);
  });
});

describe("paywall: mod erişimi", () => {
  it("ücretsizde 5 mod TAM AÇIK (tier'den bağımsız, task'ın kendi listesi)", () => {
    const free = ["frekans-bulma", "kesim-noktasi", "q-genisligi", "boost-mu-cut-mu", "kompresor"];
    assert.deepEqual([...paywall.FREE_MODE_IDS].sort(), free.sort());
    free.forEach(id => {
      const r = paywall.checkModeAccess(id, { isPro: false, now: 1000 });
      assert.equal(r.allowed, true, `${id} ücretsizde açık olmalı`);
      assert.equal(r.reason, null);
    });
  });

  it("ücretsizde 4 mod KİLİTLİ (dB Seviyesi/Reverb/Tonal Denge/Distortion) — reason='pro'", () => {
    ["db-seviyesi", "reverb", "tonal-denge", "distortion"].forEach(id => {
      const r = paywall.checkModeAccess(id, { isPro: false, now: 1000 });
      assert.equal(r.allowed, false, `${id} ücretsizde kilitli olmalı`);
      assert.equal(r.reason, "pro");
    });
  });

  it("Pro'da HER mod (dailyTaste dahil, hiç oynanmamış bile olsa) açık", () => {
    ["db-seviyesi", "reverb", "tonal-denge", "distortion", "frekans-cakismasi", "kompresor"].forEach(id => {
      const r = paywall.checkModeAccess(id, { isPro: true, now: 1000 });
      assert.equal(r.allowed, true, `${id} Pro'da açık olmalı`);
    });
  });

  it("Frekans Çakışması: ücretsizde HİÇ oynanmamışsa açık (günün ilk tadımı)", () => {
    const r = paywall.checkModeAccess("frekans-cakismasi", { isPro: false, dailyTasteLastPlayedAt: null, now: 1000 });
    assert.equal(r.allowed, true);
  });

  it("Frekans Çakışması: aynı takvim günü içinde İKİNCİ deneme kilitli — reason='daily-used'", () => {
    const morning = new Date(2026, 7, 8, 9, 0, 0).getTime();
    const evening = new Date(2026, 7, 8, 23, 0, 0).getTime();
    const r = paywall.checkModeAccess("frekans-cakismasi", { isPro: false, dailyTasteLastPlayedAt: morning, now: evening });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, "daily-used");
  });

  it("Frekans Çakışması: ERTESİ GÜN tekrar açık", () => {
    const day1 = new Date(2026, 7, 8, 23, 59, 0).getTime();
    const day2 = new Date(2026, 7, 9, 0, 1, 0).getTime();
    const r = paywall.checkModeAccess("frekans-cakismasi", { isPro: false, dailyTasteLastPlayedAt: day1, now: day2 });
    assert.equal(r.allowed, true);
  });

  it("Frekans Çakışması: SAAT GERİYE ALINIRSA istismar engellenir (hâlâ kilitli sayılır)", () => {
    const playedAt = new Date(2026, 7, 8, 12, 0, 0).getTime();
    const rolledBackTo = new Date(2026, 7, 7, 12, 0, 0).getTime(); // bir gün geri
    assert.equal(paywall.canPlayDailyTaste(playedAt, rolledBackTo), false);
    const r = paywall.checkModeAccess("frekans-cakismasi", { isPro: false, dailyTasteLastPlayedAt: playedAt, now: rolledBackTo });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, "daily-used");
  });

  it("Frekans Çakışması: saat AYNI ANA denk gelirse (now===lastPlayedAt) hâlâ kilitli", () => {
    const t = 5_000_000;
    assert.equal(paywall.canPlayDailyTaste(t, t), false);
  });
});

// G190 (Bug: modeLocked paywall metninin SABİT/eksik mod listesi) —
// fullyLockedModeIds() FREE_MODE_IDS + DAILY_TASTE_MODE_ID DIŞINDAKİ TÜM
// modları döndürüyor mu, formatNameList() Türkçe "A, B ve C" birleştirmesini
// doğru yapıyor mu.
describe("paywall: tam kilitli mod listesi (modeLocked paywall metni, G190)", () => {
  it("FREE_MODE_IDS + günlük-tadımlık DIŞINDAKİ modları döndürür", () => {
    const all = ["frekans-bulma", "kesim-noktasi", "q-genisligi", "boost-mu-cut-mu", "kompresor",
      "db-seviyesi", "reverb", "tonal-denge", "distortion", "frekans-cakismasi", "pan-konumu", "stereo-genislik"];
    const locked = paywall.fullyLockedModeIds(all);
    assert.deepEqual(locked.sort(), ["db-seviyesi", "reverb", "tonal-denge", "distortion", "pan-konumu", "stereo-genislik"].sort());
  });

  it("ücretsiz modlar ve günlük-tadımlık modu SONUÇTA YOK", () => {
    const all = [...paywall.FREE_MODE_IDS, paywall.DAILY_TASTE_MODE_ID, "reverb"];
    const locked = paywall.fullyLockedModeIds(all);
    assert.deepEqual(locked, ["reverb"]);
  });

  it("formatNameList: boş dizi boş string döner", () => {
    assert.equal(paywall.formatNameList([]), "");
  });

  it("formatNameList: tek eleman AYNEN döner ('ve' eklenmez)", () => {
    assert.equal(paywall.formatNameList(["Reverb"]), "Reverb");
  });

  it("formatNameList: iki eleman 've' ile birleşir", () => {
    assert.equal(paywall.formatNameList(["Reverb", "Distortion"]), "Reverb ve Distortion");
  });

  it("formatNameList: altı eleman — virgüllü liste + son elemandan önce 've'", () => {
    const names = ["dB Seviyesi", "Reverb", "Tonal Denge", "Distortion", "Pan Konumu", "Stereo Genişlik"];
    assert.equal(
      paywall.formatNameList(names),
      "dB Seviyesi, Reverb, Tonal Denge, Distortion, Pan Konumu ve Stereo Genişlik"
    );
  });
});

describe("paywall: oturum soru limiti", () => {
  it("ücretsizde 5. soru posedildikten sonra limit dolar", () => {
    assert.equal(paywall.isFreeSessionLimitReached(4, false), false);
    assert.equal(paywall.isFreeSessionLimitReached(5, false), true);
    assert.equal(paywall.isFreeSessionLimitReached(9, false), true);
  });

  it("Pro'da limit HİÇBİR ZAMAN dolmaz", () => {
    assert.equal(paywall.isFreeSessionLimitReached(5, true), false);
    assert.equal(paywall.isFreeSessionLimitReached(500, true), false);
  });

  // G185 (Bug 25) — reklamla kazanılan ek soru hakkı, çağıran tarafın (app.js)
  // BÜYÜTTÜĞÜ bir limit parametresiyle test ediliyor (bu fonksiyon uzatma
  // MİKTARINI bilmiyor, saf kalıyor).
  it("limit parametresi büyütülünce (reklamla kazanılan ek soru) 5. soruda DOLMAZ", () => {
    assert.equal(paywall.isFreeSessionLimitReached(5, false, 10), false);
    assert.equal(paywall.isFreeSessionLimitReached(9, false, 10), false);
    assert.equal(paywall.isFreeSessionLimitReached(10, false, 10), true);
  });
});

describe("paywall: sessionLimit reklam kotası (Bug 25, G185) — günde en fazla 3", () => {
  it("hiç izlenmemişse (watchesDate=null) 3 hak vardır", () => {
    assert.equal(paywall.sessionAdWatchesRemainingToday(0, null, 1000), 3);
  });

  it("bugün 2 kez izlenmişse 1 hak kalır", () => {
    const now = new Date(2026, 7, 8, 12, 0, 0).getTime();
    const today = paywall.localDateKey(now);
    assert.equal(paywall.sessionAdWatchesRemainingToday(2, today, now), 1);
  });

  it("bugün 3 kez izlenmişse (kota dolu) 0 hak kalır, negatife inmez", () => {
    const now = new Date(2026, 7, 8, 12, 0, 0).getTime();
    const today = paywall.localDateKey(now);
    assert.equal(paywall.sessionAdWatchesRemainingToday(3, today, now), 0);
    assert.equal(paywall.sessionAdWatchesRemainingToday(5, today, now), 0);
  });

  it("sayaç DÜNKÜ bir güne aitse (watchesDate farklı) bugün YENİDEN 3 hak", () => {
    const yesterday = new Date(2026, 7, 7, 23, 0, 0).getTime();
    const today = new Date(2026, 7, 8, 1, 0, 0).getTime();
    const yesterdayKey = paywall.localDateKey(yesterday);
    assert.equal(paywall.sessionAdWatchesRemainingToday(3, yesterdayKey, today), 3);
  });

  it("recordSessionAdWatch: ilk izlemede 1'e çıkar, bugünün tarihini yazar", () => {
    const now = new Date(2026, 7, 8, 12, 0, 0).getTime();
    const r = paywall.recordSessionAdWatch(0, null, now);
    assert.equal(r.sessionAdWatchesToday, 1);
    assert.equal(r.sessionAdWatchesDate, paywall.localDateKey(now));
  });

  it("recordSessionAdWatch: aynı gün İKİNCİ izlemede 2'ye çıkar (sıfırlanmaz)", () => {
    const now = new Date(2026, 7, 8, 15, 0, 0).getTime();
    const today = paywall.localDateKey(now);
    const r = paywall.recordSessionAdWatch(1, today, now);
    assert.equal(r.sessionAdWatchesToday, 2);
    assert.equal(r.sessionAdWatchesDate, today);
  });

  it("recordSessionAdWatch: YENİ günde (eski watchesDate farklı) 1'den başlar", () => {
    const yesterday = new Date(2026, 7, 7, 23, 0, 0).getTime();
    const today = new Date(2026, 7, 8, 1, 0, 0).getTime();
    const r = paywall.recordSessionAdWatch(3, paywall.localDateKey(yesterday), today);
    assert.equal(r.sessionAdWatchesToday, 1);
    assert.equal(r.sessionAdWatchesDate, paywall.localDateKey(today));
  });
});

describe("paywall: can dolumu (gerçek zaman tabanlı, 30 dakikada 1)", () => {
  it("tam doluyken (5/5) dolum tetiklenmez, lastRefillAt korunur", () => {
    const r = paywall.applyLivesRefill(5, 1000, 999999, { totalLives: 5 });
    assert.equal(r.lives, 5);
    assert.equal(r.lastRefillAt, 1000);
  });

  it("29 dakika geçince HENÜZ dolum yok", () => {
    const start = 0;
    const now = 29 * MIN_MS;
    const r = paywall.applyLivesRefill(3, start, now, { totalLives: 5, intervalMs: 30 * MIN_MS });
    assert.equal(r.lives, 3);
    assert.equal(r.lastRefillAt, start);
  });

  it("TAM 30 dakika geçince 1 can dolar, referans zamanı 30dk ilerler (drift yok)", () => {
    const start = 0;
    const now = 30 * MIN_MS;
    const r = paywall.applyLivesRefill(3, start, now, { totalLives: 5, intervalMs: 30 * MIN_MS });
    assert.equal(r.lives, 4);
    assert.equal(r.lastRefillAt, 30 * MIN_MS);
  });

  it("95 dakika geçince (3 tam aralık) 3 can birden dolar, tavana çarpmaz", () => {
    const start = 0;
    const now = 95 * MIN_MS;
    const r = paywall.applyLivesRefill(1, start, now, { totalLives: 5, intervalMs: 30 * MIN_MS });
    assert.equal(r.lives, 4); // 1 + 3
    assert.equal(r.lastRefillAt, 90 * MIN_MS); // 3*30dk ilerledi, kalan 5dk bir sonraki tur için korunuyor
  });

  it("dolum TOTAL_LIVES tavanını asla aşmaz (uzun süre kapalı kalınca bile)", () => {
    const start = 0;
    const now = 10 * DAY_MS;
    const r = paywall.applyLivesRefill(1, start, now, { totalLives: 5, intervalMs: 30 * MIN_MS });
    assert.equal(r.lives, 5);
    assert.equal(r.lastRefillAt, now); // tavana ulaşınca referans "şimdi"ye sabitlenir
  });

  it("SAAT GERİYE ALINIRSA (now <= lastRefillAt) dolum YOK, referans korunur — istismar koruması", () => {
    const lastRefillAt = 10 * HOUR_MS;
    const rolledBackNow = 5 * HOUR_MS;
    const r = paywall.applyLivesRefill(2, lastRefillAt, rolledBackNow, { totalLives: 5, intervalMs: 30 * MIN_MS });
    assert.equal(r.lives, 2);
    assert.equal(r.lastRefillAt, lastRefillAt);
  });

  it("onLifeLost: tam doluyken can kaybedilince referans 'now'a çekilir", () => {
    const now = 12345;
    assert.equal(paywall.onLifeLost(5, 4, 1000, now, 5), now);
  });

  it("onLifeLost: zaten dolu DEĞİLKEN (ör. 3→2) referans DEĞİŞMEZ — sayaç kaldığı yerden devam eder", () => {
    assert.equal(paywall.onLifeLost(3, 2, 1000, 99999, 5), 1000);
  });

  it("onLifeLost: can artışında (dolum) referansa dokunulmaz", () => {
    assert.equal(paywall.onLifeLost(3, 4, 1000, 99999, 5), 1000);
  });
});

describe("paywall: diğer kilitler — hepsi ücretsizde kilitli, Pro'da açık", () => {
  const locks = [
    "isUploadLocked",
    "isFixedDifficultyLocked",
    "isFocusRangeLocked",
    "isWeakZoneReportLocked",
    "isZoneHistoryBlurred",
    "isExamLocked",
    "isFreePlayModeLocked",
    "isToolsContentLocked"
  ];
  locks.forEach(fnName => {
    it(`${fnName}: ücretsizde true, Pro'da false`, () => {
      assert.equal(paywall[fnName](false), true);
      assert.equal(paywall[fnName](true), false);
    });
  });
});

describe("paywall: kilit mesajları", () => {
  it("her LOCK_MESSAGES girdisi bir title+detail içerir (boş string yok)", () => {
    Object.entries(paywall.LOCK_MESSAGES).forEach(([key, msg]) => {
      assert.ok(msg.title && msg.title.length > 0, `${key}.title boş olmamalı`);
      assert.ok(msg.detail && msg.detail.length > 0, `${key}.detail boş olmamalı`);
    });
  });
});

describe("paywall: ilk oturumda paywall yok (Parça 2)", () => {
  it("stats.rounds=0 (hiç oynanmamış) → ilk oturum, paywall bastırılmalı", () => {
    assert.equal(paywall.isFirstSession(0), true);
  });

  it("stats.rounds>0 (daha önce oynanmış) → ilk oturum DEĞİL", () => {
    assert.equal(paywall.isFirstSession(1), false);
    assert.equal(paywall.isFirstSession(500), false);
  });
});

describe("paywall: paywall ekranı içeriği (Parça 2)", () => {
  it("7 tetikleme noktasının HEPSİ PAYWALL_REASONS'ta tanımlı, hepsi kicker/title/detail/buttons içerir", () => {
    // G65: freePlayMode eklendi ("Serbest" oyun türü ücretsizde kilitli).
    const expectedKeys = ["sessionLimit", "livesOut", "modeLocked", "upload", "dailyUsed", "zoneHistory", "freePlayMode"];
    assert.deepEqual(Object.keys(paywall.PAYWALL_REASONS).sort(), expectedKeys.sort());
    Object.entries(paywall.PAYWALL_REASONS).forEach(([key, r]) => {
      assert.ok(r.kicker && r.kicker.length > 0, `${key}.kicker boş olmamalı`);
      assert.ok(r.title && r.title.length > 0, `${key}.title boş olmamalı`);
      assert.ok(r.detail && r.detail.length > 0, `${key}.detail boş olmamalı`);
      assert.ok(r.buttons === "pro" || r.buttons === "livesOut", `${key}.buttons geçersiz: ${r.buttons}`);
    });
  });

  it("SADECE livesOut 'livesOut' buton setini kullanır (reklam SADECE can bitince anlamlı)", () => {
    assert.equal(paywall.PAYWALL_REASONS.livesOut.buttons, "livesOut");
    ["sessionLimit", "modeLocked", "upload", "dailyUsed", "zoneHistory", "freePlayMode"].forEach(key => {
      assert.equal(paywall.PAYWALL_REASONS[key].buttons, "pro", `${key} 'pro' buton setini kullanmalı`);
    });
  });

  // G185 (Bug 25) — endsRound: paywall açılırken round ZATEN bitirilmiş miydi
  // (X'te "menu"ye dönülmeli mi). SADECE livesOut+sessionLimit true — ikisi de
  // finalizeIfGameOver()/blockIfSessionLimitReached() üzerinden, round
  // TEARDOWN edildikten SONRA açılıyor.
  it("SADECE livesOut ve sessionLimit endsRound:true — diğer 5 sebep endsRound:false", () => {
    assert.equal(paywall.PAYWALL_REASONS.livesOut.endsRound, true);
    assert.equal(paywall.PAYWALL_REASONS.sessionLimit.endsRound, true);
    ["modeLocked", "upload", "dailyUsed", "zoneHistory", "freePlayMode"].forEach(key => {
      assert.equal(paywall.PAYWALL_REASONS[key].endsRound, false, `${key} endsRound:false olmalı`);
    });
  });

  // G185 (Bug 25, karar 1) — adGrant: reklamın NE kazandırdığı. livesOut→"life"
  // (kotasız, DEĞİŞMEDİ), sessionLimit→"sessionExtension" (YENİ, günde 3
  // kotalı), diğer 5 sebepte reklam seçeneği YOK.
  it("livesOut adGrant='life', sessionLimit adGrant='sessionExtension', diğerlerinde YOK", () => {
    assert.equal(paywall.PAYWALL_REASONS.livesOut.adGrant, "life");
    assert.equal(paywall.PAYWALL_REASONS.sessionLimit.adGrant, "sessionExtension");
    ["modeLocked", "upload", "dailyUsed", "zoneHistory", "freePlayMode"].forEach(key => {
      assert.equal(paywall.PAYWALL_REASONS[key].adGrant, undefined, `${key} adGrant taşımamalı`);
    });
  });

  // G89: Prototip.dc.html "PAYWALL" bloğunun 7 maddesiyle hizalandı — "Zayıf
  // bölge raporu ve geçmiş grafiği" (isWeakZoneReportLocked/isZoneHistoryBlurred'in
  // GERÇEK Pro ayrıcalığı) ÖNCEDEN listede eksikti, eklendi.
  it("PRO_BENEFITS task'ın 7 maddesinin hepsini içerir, boş değil", () => {
    assert.equal(paywall.PRO_BENEFITS.length, 7);
    paywall.PRO_BENEFITS.forEach(b => assert.ok(b && b.length > 0));
  });

  it("PRO_PRICE ₺399", () => {
    assert.equal(paywall.PRO_PRICE, "₺399");
  });
});

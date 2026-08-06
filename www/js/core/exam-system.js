// G47/G48 — SINAV SİSTEMİ: merkezi altyapı. Seviye atlamayı "sessiz XP artışı"ndan
// "bölüm geçme / yeterlilik sınavı" olayına çeviren katman — mevcut soru
// üretimini (mode.createQuestion) ÇAĞIRIR, DEĞİŞTİRMEZ; mevcut XP/seviye
// hesabını (progress.js) ÇAĞIRIR, PARALEL BİR SİSTEM KURMAZ (bkz. progress.js
// modeLevel() üzerindeki not). Ses/DOM'a hiç dokunmaz — round-flow.js/
// audio-engine.js'in AYNI "factory + callback yok, sadece durum + saf sorgu"
// felsefesi: app.js SADECE bu modülün döndürdüğü `event`'lere göre UI/ses tepkisi
// üretir, bu dosya HİÇBİR yerde `document`/`Audio` görmez.
//
// ═══════════════════════════════════════════════════════════════════════════
// G48 DÜZELTMESİ — kullanıcının kendi tespit ettiği İKİ gerçek hata giderildi:
//   1. TELAFİ YANLIŞ YERE BAĞLIYDI: G47'de telafi "sınavda kalınca" (exam-
//      failed) tetikleniyordu; task'ın DOĞRU akışı telafinin PARKUR
//      başarısızlığına (10 soru sonunda <6 doğru, kombo da 6'ya hiç
//      ulaşmadıysa) bağlanmasıydı. DÜZELTİLDİ: parkur <6 doğruyla biterse
//      artık DOĞRUDAN parkur baştan atmıyor, "remedial-start" olayı üretip
//      telafiyi BAŞLATIYOR. Sınavda kalmak (exam-failed) artık BASİT: telafi
//      YOK, doğrudan parkur baştan (task: "basit tut").
//   2. "remedial-exam" (telafi SONRASI tekrar sınav) fazı TAMAMEN KALDIRILDI —
//      artık telafinin KENDİSİ bir REMEDIAL_PASS_COUNT eşiğiyle geçilir/
//      geçilemez (task: "Telafi GEÇİLİRSE → devam, GEÇİLEMEZSE → baştan
//      başlar" — ayrı bir "tekrar sınav" adımından HİÇ bahsetmiyor).
// ═══════════════════════════════════════════════════════════════════════════
//
// MEKANİK (task'ın kendi tanımı — DURUM.md/TASARIM.md'de "SINAV SİSTEMİ"
// başlıklı bir bölüm G47'de ARANDI, BULUNAMADI; bu dosya SADECE görev
// mesajlarındaki mekanik açıklamalarından türetildi — bkz. DURUM.md G47/G48
// BİTTİ):
//   1. 10 SORULUK PARKUR — her doğru/yanlış cevap parkur pozisyonunu ilerletir.
//   2. SINAV HAKKI iki yoldan biriyle açılır:
//      a) KOMBO: parkur İÇİNDE 6 soruya PEŞ PEŞE doğru (comboInParkur) →
//         parkur bitmeden ERKEN açılır — ["exam-offer" olayı, kullanıcı onaylamalı].
//      b) TOPLAM: peş peşe olmadıysa (kombo kırıldı), parkur SONUNDA (10.
//         soru) toplam >=6 doğru → sınav OTOMATİK açılır.
//   3. Parkur sonunda toplam <6 doğru (ne kombo ne toplam yolu) → zayıf
//      KADEMEDE (bkz. getWeakTier) REMEDIAL_LENGTH soruluk bir TELAFİ
//      parkuru başlar.
//      - Telafi GEÇİLİRSE (REMEDIAL_PASS_COUNT+ doğru) → parkur BAŞTAN
//        (yeni/normal bir 10 soruluk koşu, "devam").
//      - Telafi GEÇİLEMEZSE → parkur YİNE BAŞTAN (aynı sonuç, farklı olay —
//        app.js farklı bir geri bildirim METNİ gösterebilsin diye ayrı
//        event, mekanik SONUÇ ikisinde de AYNI: taze bir parkur).
//   4. SINAV: EXAM_LENGTH soru, mod.EXAM_DIFFICULTY zorluğunda (zorlaştırılmış) —
//      EXAM_PASS_COUNT+ doğru → GEÇTİ (seviye atlar, "BÖLÜM GEÇTİN"). Az
//      doğru → KALDI — BASİT tutuldu (task): telafi YOK, doğrudan parkur
//      baştan.
//
// comboInParkur GLOBAL stats.combo'yu KULLANMAZ (BİLİNÇLİ karar) — stats.combo
// TÜM modlar/oturumlar arasında PAYLAŞILAN, hiçbir mod/parkur sınırında
// sıfırlanmayan bir sayaç (bkz. app.js submitThreeWayGuess). Onu kullanmak,
// başka bir modda kurulmuş bir seriyi Kompresör'ün parkuruna SIZDIRIRDI
// ("1 Kompresör sorusu + önceki 5 Frekans Bulma sorusu = yanlışlıkla kombo 6").
// Bu modül KENDİ, mod+parkur'a SIKI SIKIYA bağlı sayacını tutar.
// ═══════════════════════════════════════════════════════════════════════════

export const EXAM_CONFIG = {
  PARKUR_LENGTH: 10,
  COMBO_THRESHOLD: 6,     // parkur İÇİNDE peş peşe doğru → erken sınav teklifi
  TOTAL_THRESHOLD: 6,     // parkur SONUNDA toplam doğru → sınav (kombo kırılmışsa bile)
  EXAM_LENGTH: 4,         // sınav soru sayısı — task'ın "örn 3-5" aralığından seçildi
  EXAM_PASS_COUNT: 3,     // sınavı geçmek için gereken doğru sayısı (4'te 3 = %75, "çoğunu")
  REMEDIAL_LENGTH: 5,     // telafi parkuru soru sayısı — task'ın kendi sayısı
  // G48: task "Telafi GEÇİLİRSE/GEÇİLEMEZSE" diyor ama kesin bir eşik
  // VERMİYOR — sınavın (EXAM_PASS_COUNT/EXAM_LENGTH=%75) AKSİNE telafi
  // "zorlaştırılmış" DEĞİL, kullanıcının KENDİ zayıf kademesinde bir pratik
  // turu — bu yüzden daha YUMUŞAK bir çoğunluk eşiği (5'te 3 = %60) seçildi.
  // KULAKLA/PLAYTEST DOĞRULANMADI, makul bir başlangıç (diğer tüm sayılarla
  // AYNI dürüstlük notu).
  REMEDIAL_PASS_COUNT: 3,
  // Zayıf kademe aramasında denenecek sıra — "proplus" BİLEREK dışarıda (o,
  // difficulty merdiveninin bir noktası değil, ayrı/özel bir mod — bkz.
  // difficulty-curve.js tierForLevel dosya başı notu, Z5 kararı).
  TIER_ORDER: ["easy", "medium", "hard", "pro"],
  // Bir kademenin "zayıf" sayılabilmesi için gereken asgari örnek sayısı —
  // personalization.js'in MIN_SAMPLES'ıyla AYNI felsefe (yetersiz veriyle
  // erken karar vermemek).
  MIN_TIER_SAMPLES: 3
};

// ═══════════════════════════════════════════════════════════════════════════
// SAF FONKSİYONLAR — tierStats kayıt/sorgu (kişiselleştirme, personalization.js'in
// zoneWeakness'ıyla AYNI ROL ama frekans BÖLGESİ yerine ZORLUK KADEMESİ üzerinde;
// Kompresör'ün bölge kavramı olmadığı için bu şekilde uyarlandı — task onayı).
// ═══════════════════════════════════════════════════════════════════════════

// tierStats: { [tier]: { correct, wrong } }. Immutable güncelleme (çağıran taraf
// stats.examState[modeId].tierStats'a ATAR, mutasyon YOK — progress.js'in
// SAF fonksiyon geleneğiyle tutarlı).
export function recordTierResult(tierStats, tier, correct) {
  const next = { ...(tierStats || {}) };
  const cur = next[tier] || { correct: 0, wrong: 0 };
  next[tier] = correct
    ? { correct: cur.correct + 1, wrong: cur.wrong }
    : { correct: cur.correct, wrong: cur.wrong + 1 };
  return next;
}

// En düşük doğrulukla (VE en az MIN_TIER_SAMPLES örnekle) kademeyi döner —
// { tier, accuracy } ya da hiçbir kademe yeterli veri taşımıyorsa null (yeni
// kullanıcı — henüz kişiselleştirilecek bir şey yok, çağıran taraf bu durumda
// varsayılan/orta bir kademeye düşmeli).
export function getWeakTier(tierStats, config = EXAM_CONFIG) {
  let weakest = null;
  for (const tier of config.TIER_ORDER) {
    const t = tierStats && tierStats[tier];
    if (!t) continue;
    const total = t.correct + t.wrong;
    if (total < config.MIN_TIER_SAMPLES) continue;
    const accuracy = t.correct / total;
    if (!weakest || accuracy < weakest.accuracy) weakest = { tier, accuracy };
  }
  return weakest;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATEFUL — round-flow.js'in AYNI factory deseni: modül-seviyesi değil, app.js
// TEK bir örnek yaratıp elde tutuyor (bkz. app.js `const examSystem =
// createExamSystem();`). TÜM durum BELLEKTE (persist EDİLMEZ) — roundsInThisPlaySession'ın
// AYNI kararı (bkz. app.js dosya başı notu): sayfa yenilenince mevcut parkurun
// ORTASINDAKİ ilerleme kaybolur, bu KABUL EDİLEBİLİR (diğer session-scoped
// sayaçlarla AYNI emsal) — SADECE kalıcı/uzun-vadeli veri (examLevel, tierStats)
// stats.examState üzerinden app.js'te AYRICA persist edilir (bkz. app.js
// examStatsFor).
// ═══════════════════════════════════════════════════════════════════════════

export function createExamSystem(config = EXAM_CONFIG) {
  let modeId = null;
  // "parkur"     — normal 10 soruluk koşu
  // "exam-offer" — kombo 6'ya ulaştı, kullanıcı erken sınava geçsin mi diye SORULUYOR
  // "exam"       — sınav soruları cevaplanıyor
  // "remedial"   — telafi soruları cevaplanıyor (kademe = remedialTier) — G48:
  //                SADECE parkur TOPLAM<6 olduğunda buraya girilir, "sınavda
  //                kalınca" DEĞİL (bkz. dosya başı G48 notu).
  let phase = "parkur";
  let position = 0;         // parkur içinde cevaplanan soru sayısı [0, PARKUR_LENGTH]
  let parkurCorrect = 0;    // parkur içinde TOPLAM doğru (kombo kırılsa da SIFIRLANMAZ)
  let comboInParkur = 0;    // parkur içinde PEŞ PEŞE doğru (yanlışta sıfırlanır)
  let examOffered = false;  // bu parkurda erken-sınav teklifi ZATEN gösterildi mi (bir kez)
  let examIndex = 0;
  let examCorrect = 0;
  let remedialIndex = 0;
  let remedialCorrect = 0;
  let remedialTier = null;

  function resetParkur() {
    phase = "parkur";
    position = 0;
    parkurCorrect = 0;
    comboInParkur = 0;
    examOffered = false;
    examIndex = 0;
    examCorrect = 0;
    remedialIndex = 0;
    remedialCorrect = 0;
    remedialTier = null;
  }

  // Mod değişince (app.js enterMode) çağrılır — FARKLI bir mod'a geçilmişse
  // durum SIFIRLANIR (bir modun yarım kalan parkuru başka bir moda SIZMAZ).
  // AYNI moda tekrar girmek (menüden geri dönüp aynı karta basmak) parkuru
  // KORUR — kullanıcı yarım kalan bir parkuru menüye kaçıp devam ettirebilmeli.
  function setMode(id) {
    if (id !== modeId) {
      modeId = id;
      resetParkur();
    }
  }

  // app.js'in createQuestion çağrısında KULLANICININ seçtiği zorluk YERİNE
  // hangi zorluğun geçirileceğini belirler. examDifficulty: mod.EXAM_DIFFICULTY
  // (ör. "pro") — normal parkur sorularında HİÇ devreye girmez, kullanıcının
  // kendi Otomatik/Sabit seçimi AYNEN çalışmaya devam eder.
  function questionTier(userSelectedTier, examDifficulty) {
    if (phase === "exam") return examDifficulty;
    if (phase === "remedial") return remedialTier || userSelectedTier;
    return userSelectedTier;
  }

  // app.js'in "Soru N/10" göstergesinin (els.roundChip) YERİNE geçecek metin —
  // exam-enabled bir modda oyun uzunluğu (Serbest/10 Soruluk Bölüm) FARK ETMEKSİZİN
  // HER ZAMAN bu kullanılır (bkz. app.js renderQuestion). G48: app.js'in oto-
  // geçiş butonunun ÖNEKİ de (ensureAutoNext) artık AYNI etiketi kullanıyor —
  // "10/5 tutarsızlığı" (üstte "Soru 6/10", buton "Sonraki (5)") bu YÜZDEN
  // oluşuyordu: buton hiç bu etiketi OKUMUYORDU, jenerik "Sonraki" + saniye
  // geri sayımı gösteriyordu (o "(5)" bir soru sayacı DEĞİL, saniye geri
  // sayımıydı — ama İKİSİ birden ekranda "5" ve "10" görününce ÇAKIŞIYORMUŞ
  // gibi okunuyordu). Artık HER İKİ yüzey de (üst chip + alt buton öneki) BU
  // fonksiyondan besleniyor, tutarlı.
  function label() {
    if (phase === "exam") return `Sınav ${examIndex + 1}/${config.EXAM_LENGTH}`;
    if (phase === "remedial") return `Telafi ${remedialIndex + 1}/${config.REMEDIAL_LENGTH}`;
    return `Soru ${position + 1}/${config.PARKUR_LENGTH}`;
  }

  // Bir cevap verildikten SONRA (mode.evaluateAnswer sonucu belli olunca) ÇAĞRILIR.
  // Dönen `event` alanı app.js'in bir SONRAKİ adımda ne göstereceğini/yapacağını
  // belirler:
  //   "continue"         — hiçbir özel olay yok, normal akışa devam
  //   "exam-offer"        — erken sınav teklifi göster (remaining: kaç soru kaldı)
  //   "exam-start"        — parkur TOPLAM eşiğiyle sınav otomatik başladı
  //   "remedial-start"     — parkur <6 doğruyla bitti (kombo da hiç 6'ya ulaşmadı) —
  //                          app.js getWeakTier() ile bulduğu kademeyi vererek
  //                          startRemedial(tier) ÇAĞIRMALI (bkz. o fonksiyon)
  //   "exam-passed"        — sınav geçildi (examLevel'i artırmak/kutlama app.js'in işi)
  //   "exam-failed"        — sınav kaybedildi — G48: BASİT, telafi YOK, parkur
  //                          BAŞTAN (resetParkur ZATEN çağrıldı)
  //   "remedial-passed"    — telafi geçildi — parkur BAŞTAN (yeni/normal koşu,
  //                          "devam" — resetParkur ZATEN çağrıldı)
  //   "remedial-failed"    — telafi geçilemedi — parkur YİNE BAŞTAN (resetParkur
  //                          ZATEN çağrıldı; SONUÇ remedial-passed'la AYNI, SADECE
  //                          app.js'in göstereceği METİN farklı olsun diye ayrı olay)
  function recordAnswer(correct, tier) {
    if (phase === "parkur") {
      position++;
      if (correct) { parkurCorrect++; comboInParkur++; } else { comboInParkur = 0; }

      if (!examOffered && comboInParkur >= config.COMBO_THRESHOLD && position < config.PARKUR_LENGTH) {
        examOffered = true;
        phase = "exam-offer";
        return { event: "exam-offer", remaining: config.PARKUR_LENGTH - position };
      }
      if (position >= config.PARKUR_LENGTH) {
        if (parkurCorrect >= config.TOTAL_THRESHOLD) {
          phase = "exam";
          examIndex = 0;
          examCorrect = 0;
          return { event: "exam-start" };
        }
        // G48 DÜZELTMESİ: ÖNCEDEN burada resetParkur() + "parkur-failed" vardı
        // (telafi YOKTU). Artık telafi TAM OLARAK burada başlıyor — parkur
        // fazı BİLEREK "parkur" olarak BIRAKILIYOR (henüz remedialTier YOK),
        // app.js "remedial-start" olayını alınca getWeakTier()'i hesaplayıp
        // startRemedial(tier) ÇAĞIRARAK fazı "remedial"e GEÇİRİYOR (bkz. o
        // fonksiyon) — aynı senkron çağrı zincirinde, kullanıcı arada hiçbir
        // soru GÖRMÜYOR.
        return { event: "remedial-start" };
      }
      return { event: "continue" };
    }

    if (phase === "exam") {
      examIndex++;
      if (correct) examCorrect++;
      if (examIndex >= config.EXAM_LENGTH) {
        const passed = examCorrect >= config.EXAM_PASS_COUNT;
        if (passed) {
          phase = "passed";
          return { event: "exam-passed" };
        }
        // G48: BASİT tutuldu — telafi YOK, doğrudan parkur baştan.
        resetParkur();
        return { event: "exam-failed" };
      }
      return { event: "continue" };
    }

    if (phase === "remedial") {
      remedialIndex++;
      if (correct) remedialCorrect++;
      if (remedialIndex >= config.REMEDIAL_LENGTH) {
        const passed = remedialCorrect >= config.REMEDIAL_PASS_COUNT;
        resetParkur(); // İKİ durumda da (geçti/geçemedi) SONUÇ aynı: taze bir parkur
        return { event: passed ? "remedial-passed" : "remedial-failed" };
      }
      return { event: "continue" };
    }

    return { event: "continue" };
  }

  function acceptEarlyExam() {
    if (phase !== "exam-offer") return;
    phase = "exam";
    examIndex = 0;
    examCorrect = 0;
  }

  // Kullanıcı erken sınavı REDDEDERSE parkura geri döner — examOffered=true
  // olarak KALIR (aynı parkurda tekrar tekrar SORULMAZ), ama parkur TOPLAM
  // eşiği (10. soru sonunda >=6 doğru) hâlâ geçerli bir ikinci yol olarak kalır.
  function declineEarlyExam() {
    if (phase !== "exam-offer") return;
    phase = "parkur";
  }

  // "remedial-start" olayından sonra app.js'in getWeakTier() ile bulduğu
  // kademeyi vererek çağırması gereken fonksiyon — telafi parkurunu başlatır.
  function startRemedial(tier) {
    remedialTier = tier;
    phase = "remedial";
    remedialIndex = 0;
    remedialCorrect = 0;
  }

  // "exam-passed" olayından sonra app.js kutlamayı gösterip (ve examLevel'i
  // artırıp) BUNU çağırır — parkur sıfırdan başlar (yeni bir 10 soruluk koşu).
  function acknowledgePassed() {
    resetParkur();
  }

  return {
    setMode,
    resetParkur,
    questionTier,
    label,
    recordAnswer,
    acceptEarlyExam,
    declineEarlyExam,
    startRemedial,
    acknowledgePassed,
    get modeId() { return modeId; },
    get phase() { return phase; },
    get position() { return position; },
    get parkurCorrect() { return parkurCorrect; },
    get comboInParkur() { return comboInParkur; },
    get examIndex() { return examIndex; },
    get examCorrect() { return examCorrect; },
    get remedialIndex() { return remedialIndex; },
    get remedialCorrect() { return remedialCorrect; },
    get remedialTier() { return remedialTier; }
  };
}

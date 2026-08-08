// "i" bilgi/rehber sistemi — TÜM metinler TEK YERDE (level-sheet-terms.js'in
// AYNI mantığı: çeviri/düzenleme gelince SADECE bu dosya değişir, app.js'e
// hiç dokunulmaz). Bu metinler TASLAK — kullanıcı cihazda görüp düzeltecek
// (task'ın kendi notu), kesin/nihai metin İDDİA EDİLMİYOR.
//
// İKİ AYRI mekanizma besleniyor:
//  1. KALICI "i" ikonu (ana ekran + her mod kartı) — GENERAL_GUIDE +
//     MODE_GUIDE_TEXTS. Tıkla-aç/tıkla-kapa, hiç solmaz.
//  2. GEÇİCİ round-içi ipucu bandı — ROUND_HINT_STEPS. Bir modun İLK
//     HINT_ROUNDS_LIMIT (2) round'unda görünür, sonra bir daha HİÇ
//     otomatik açılmaz (kalıcı "i" hep durur, bu SADECE ilk-kullanım
//     çarkı).

// ---- 1. Ana ekrandaki genel "i" — sistemi bir bütün olarak anlatır ----
export const GENERAL_GUIDE = {
  title: "Nasıl çalışır?",
  sections: [
    {
      heading: "Nasıl çalışır?",
      body: "Her mod gerçek bir mix kararı öğretir. Sesi dinlersin, farkı ya da değeri bulursun. Cevaptan sonra neden öyle olduğu, mixte ne anlama geldiği açıklanır — sadece doğru/yanlış değil."
    },
    {
      heading: "Seviye ve zorluk",
      body: "Doğru bildikçe seviyen yükselir, sorular incelir. Zorluk kulağınla birlikte büyür — başta belirgin farklar, sonra profesyonel ince ayrımlar."
    },
    {
      heading: "Sınav ve bölüm geçme",
      body: "Üst üste 6 doğru → sınav hakkı. Sınavı geçersen bölüm atlarsın, bir üst seviyeye çıkarsın. 6 doğru toplanmazsa zayıf olduğun yerden kısa bir telafi turu gelir. Seviye atlamak hak etmekle olur — takılırsan zorlaşmaz, aynı yerde çalışırsın."
    },
    {
      heading: "Ücretsiz ve Pro",
      body: "5 mod ücretsiz, sınırsız oynanır. Pro'da 10 modun tamamı, sınav ve seviye sistemi, kendi şarkını yükleyip çalışma ve analiz araçları açılır."
    },
    {
      heading: "Can",
      body: "5 canın var. Biterse 30 dakikada bir dolar, ya da video izleyip hemen doldurabilirsin."
    }
  ]
};

// ---- 2. Mod başına "i" — ne öğretir + nasıl oynanır + mix anlamı ----
// Anahtarlar mode-catalog.js'in id'leriyle BİREBİR aynı (10 oynanabilir mod).
export const MODE_GUIDE_TEXTS = {
  "frekans-bulma": "Hangi frekansın öne çıktığını bulursun. Sesi dinle, artırılan bölgeyi işaretle. Mixte problemli ya da eksik frekansı hızlı bulmak EQ'nun temelidir — kulağın frekansları tanıması her mix kararının başlangıcıdır.",
  "kesim-noktasi": "Bir sesin nereden kesildiğini (high-pass/low-pass) bulursun. Kesim frekansını yakala. Mixte gereksiz alt/üst bölgeyi temizlemek yer açar — kesim noktasını doğru duymak mix'i temiz tutar.",
  "q-genisligi": "EQ'nun ne kadar dar ya da geniş çalıştığını bulursun. Dar Q tek noktaya, geniş Q bölgeye dokunur. Cerrahi müdahale mi genel renk mi — Q'yu duymak müdahalenin karakterini belirler.",
  "boost-mu-cut-mu": "Bir frekansın artırıldığını mı kesildiğini mi ayırt edersin. Yön önemli: bir bölgeyi açmak (boost) ile bulanıklığı temizlemek (cut) farklı kararlardır.",
  "db-seviyesi": "İki ses arasındaki seviye farkını dB olarak bulursun. Mixte 1-2 dB bile dengeyi değiştirir — seviye farkını duymak gain staging ve balans için şarttır.",
  kompresor: "İki sesten hangisinin daha çok kompresyon yediğini bulursun. Kompresyon dinamiği kontrol eder — vokali öne çıkarır, davulu oturtur. En çok karışan konudur, kulağınla tanımak mix'in oturmasını sağlar.",
  reverb: "Sese ne kadar reverb verildiğini ayırt edersin. Reverb derinlik ve mekan katar — ama fazlası mix'i uzaklaştırır, bulanıklaştırır. Doğru miktarı duymak alanı yönetmektir.",
  "tonal-denge": "Bozulmuş bir sesin tonal dengesini kaydırıcılarla düzeltirsin — bas mı fazla, tiz mi eksik, kulağınla nötrle. Gerçek mix işi budur: referansla karşılaştır, dengesizliği duy, düzelt. Kendi mix'ini de yükleyip çalışabilirsin.",
  "frekans-cakismasi": "İki ses aynı frekansta çakışınca mix bulanıklaşır. Nerede çakıştıklarını bul, hangisinden keseceğine karar ver, kes. Gerçek mixin en klasik problemi — kick+bas, vokal+gitar çakışmasını çözmek mix'i açar. Kendi iki sesini de yükleyebilirsin.",
  distortion: "İki sesten hangisinin daha çok saturation/distortion taşıdığını bulursun. Saturation sıcaklık ve karakter katar (tube, tape), distortion sertlik. Türü ve miktarı duymak analog renk ile kontrolsüz bozulmayı ayırmaktır."
};

// ---- 3. Round-içi GEÇİCİ ipucu — ilk HINT_ROUNDS_LIMIT round'da görünür ----
// Her mod için kısa bir "dinle → [mekaniğe özgü eylem] → onayla" dizisi.
// app.js formatRoundHint() ile TEK satıra birleştirir ( → ile ayırıyor).
export const ROUND_HINT_STEPS = {
  "frekans-bulma": ["Sesi dinle", "Öne çıkan frekansı işaretle", "Cevabını onayla"],
  "kesim-noktasi": ["Sesi dinle", "Kesim noktasını bul", "Cevabını onayla"],
  "q-genisligi": ["Sesi dinle", "Bandın genişliğini tahmin et", "Cevabını onayla"],
  "boost-mu-cut-mu": ["Sesi dinle", "Boost mu cut mu, karar ver", "Cevabını onayla"],
  "db-seviyesi": ["Sesi dinle", "Seviye farkını tahmin et", "Cevabını onayla"],
  kompresor: ["A/B/C'yi dinle", "Farklı olanı seç", "Cevabını onayla"],
  reverb: ["A/B/C'yi dinle", "Farklı olanı seç", "Cevabını onayla"],
  "tonal-denge": ["Sesi dinle", "Kaydırıcılarla dengele", "Cevabını onayla"],
  "frekans-cakismasi": ["İki sesi dinle", "Çakışmayı bul ve kes", "Cevabını onayla"],
  distortion: ["A/B/C'yi dinle", "Farklı olanı seç", "Cevabını onayla"]
};

// Kaç round boyunca ipucu bandı otomatik gösterilir — task'ın kendi sayısı
// ("ilk 2 kez"). Bu SAYIYI TEK yerden okumak için export edildi (app.js
// bunu sihirli sayı olarak KENDİSİ tekrarlamıyor).
export const HINT_ROUNDS_LIMIT = 2;

// SAF FONKSİYON — hintRoundsShown: o modda BUGÜNE kadar ipucu GÖSTERİLMİŞ
// round sayısı (persisted, storage.js:freshModeState). true dönerse BU
// round'da ipucu gösterilmeli.
export function shouldShowRoundHint(hintRoundsShown) {
  return (hintRoundsShown || 0) < HINT_ROUNDS_LIMIT;
}

// SAF FONKSİYON — modId için ROUND_HINT_STEPS'i TEK okunabilir satıra
// birleştirir ("Sesi dinle → Farklı olanı seç → Cevabını onayla"). Kayıtlı
// olmayan bir modId için null döner (çağıran taraf bandı hiç göstermez).
export function formatRoundHint(modeId) {
  const steps = ROUND_HINT_STEPS[modeId];
  if (!steps || !steps.length) return null;
  return steps.join(" → ");
}

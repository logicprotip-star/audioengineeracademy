// Menü ızgarasında GÖRÜNECEK tüm egzersizlerin listesi — sadece görüntüleme meta'sı,
// oyun mantığı YOK. Şu an oynanabilir olan tek girdi (frekans-bulma) registry.js
// üzerinden GERÇEK bir mod modülüne bağlı; buradaki alanları (ad/aciklama/motor/
// kulaklikGerekli) sadece referans/varsayılandır — render sırasında gerçek
// mode.getMeta() önceliklidir (bkz. app.js renderModeGrid). Diğer 13 girdinin
// arkasında hiçbir kod yok; kartları "yakında" olarak gösterip kilitli tutmak için
// var, ileride her biri kendi modes/*.js dosyasını alıp registerMode() ile
// kaydolduğunda playable:true olacak.
// tier: "free" | "pro" — ürün kararı: unlockLevel'i en düşük 5 mod ücretsiz, kalan
// 9'u Pro (bkz. DURUM.md "Fiyat ve can ekonomisi"). Sihirli sayı yerine burada
// açıkça işaretlenir; paywall metni ve kart rozetleri bu alanı okur.
export const MODE_CATALOG = [
  // ---- Motor 1 · Değeri bul ----
  { id: "frekans-bulma", ad: "Frekans Bulma", aciklama: "Hangi frekans artırıldı?", motor: 1, kulaklikGerekli: false, unlockLevel: 1, playable: true, tier: "free" },
  { id: "kesim-noktasi", ad: "Kesim Noktası", aciklama: "Filtrenin kesim frekansı", motor: 1, kulaklikGerekli: false, unlockLevel: 2, playable: true, tier: "free" },
  { id: "q-genisligi", ad: "Q Genişliği", aciklama: "Bandın darlığını tahmin et", motor: 1, kulaklikGerekli: false, unlockLevel: 3, playable: true, tier: "free" },
  { id: "boost-mu-cut-mu", ad: "Boost mu Cut mu", aciklama: "Artırım mı, azaltım mı?", motor: 1, kulaklikGerekli: false, unlockLevel: 4, playable: true, tier: "free" },
  { id: "hiz-modu", ad: "Hız Modu", aciklama: "60 saniyede kaç tane?", motor: 1, kulaklikGerekli: false, unlockLevel: 5, playable: false, tier: "free" },
  { id: "db-seviyesi", ad: "dB Seviyesi", aciklama: "Kaç dB değişti?", motor: 1, kulaklikGerekli: false, unlockLevel: 6, playable: true, tier: "pro" },
  { id: "stereo-genislik", ad: "Stereo Genişlik", aciklama: "Ses ne kadar geniş?", motor: 1, kulaklikGerekli: true, unlockLevel: 7, playable: false, tier: "pro" },
  { id: "pan-konumu", ad: "Pan Konumu", aciklama: "Ses nereden geliyor?", motor: 1, kulaklikGerekli: true, unlockLevel: 8, playable: false, tier: "pro" },

  // ---- Motor 2 · Hangisi farklı ----
  { id: "hangisi-farkli", ad: "Hangisi Farklı", aciklama: "Üç sesten farklı olanı bul", motor: 2, kulaklikGerekli: false, unlockLevel: 10, playable: false, tier: "pro" },
  { id: "kompresor", ad: "Kompresör", aciklama: "Hangisi daha sıkıştırılmış?", motor: 2, kulaklikGerekli: false, unlockLevel: 12, playable: true, tier: "pro" },
  { id: "reverb", ad: "Reverb", aciklama: "Hangisinin reverb'i farklı?", motor: 2, kulaklikGerekli: true, unlockLevel: 14, playable: true, tier: "pro" },
  // G44: "tonal-denge" BURAYA taşındı (ÖNCEDEN Motor 1'de, "Hangi bölge fazla?"
  // farklı bir tek-değer konsepti olarak, HİÇ kod karşılığı olmadan, unlockLevel:9,
  // playable:false duruyordu) — task'ın kendisi bu ismi Motor 2'nin ÜÇÜNCÜ modu
  // (A/B/C odd-one-out, tilt-tabanlı) olarak tanımladı, o yüzden placeholder'ı
  // REPURPOSE ettik (silinip yeniden eklenmedi — id'nin GERÇEK bir kod karşılığı
  // artık var, bkz. modes/tonal-denge.js). unlockLevel Reverb(14)-Distortion(16)
  // arasına (15) yerleşti.
  { id: "tonal-denge", ad: "Tonal Denge", aciklama: "Hangisinin tonal dengesi bozuk?", motor: 2, kulaklikGerekli: true, unlockLevel: 15, playable: true, tier: "pro" },
  { id: "distortion", ad: "Distortion", aciklama: "Hangisi daha doygun?", motor: 2, kulaklikGerekli: false, unlockLevel: 16, playable: false, tier: "pro" },

  // ---- Motor 3 · İki kaynaklı ----
  { id: "frekans-cakismasi", ad: "Frekans Çakışması", aciklama: "Kick ve bas nerede çakışıyor?", motor: 3, kulaklikGerekli: false, unlockLevel: 20, playable: false, tier: "pro" }
];

// Motor numarasına göre görsel kimlik — mevcut renk paletinden (styles.css :root).
export const MOTOR_INFO = {
  1: { label: "Değeri bul", color: "var(--am)", bg: "rgba(255,176,32,.14)" },
  2: { label: "Hangisi farklı", color: "var(--bl)", bg: "rgba(108,140,255,.14)" },
  3: { label: "İki kaynaklı", color: "var(--pu)", bg: "rgba(168,85,247,.14)" }
};

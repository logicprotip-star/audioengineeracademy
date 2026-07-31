// Menü ızgarasında GÖRÜNECEK tüm egzersizlerin listesi — sadece görüntüleme meta'sı,
// oyun mantığı YOK. Şu an oynanabilir olan tek girdi (frekans-bulma) registry.js
// üzerinden GERÇEK bir mod modülüne bağlı; buradaki alanları (ad/aciklama/motor/
// kulaklikGerekli) sadece referans/varsayılandır — render sırasında gerçek
// mode.getMeta() önceliklidir (bkz. app.js renderModeGrid). Diğer 13 girdinin
// arkasında hiçbir kod yok; kartları "yakında" olarak gösterip kilitli tutmak için
// var, ileride her biri kendi modes/*.js dosyasını alıp registerMode() ile
// kaydolduğunda playable:true olacak.
export const MODE_CATALOG = [
  // ---- Motor 1 · Değeri bul ----
  { id: "frekans-bulma", ad: "Frekans Bulma", aciklama: "Hangi frekans artırıldı?", motor: 1, kulaklikGerekli: true, unlockLevel: 1, playable: true },
  { id: "kesim-noktasi", ad: "Kesim Noktası", aciklama: "Filtrenin kesim frekansı", motor: 1, kulaklikGerekli: false, unlockLevel: 2, playable: false },
  { id: "q-genisligi", ad: "Q Genişliği", aciklama: "Bandın darlığını tahmin et", motor: 1, kulaklikGerekli: false, unlockLevel: 3, playable: false },
  { id: "boost-mu-cut-mu", ad: "Boost mu Cut mu", aciklama: "Artırım mı, azaltım mı?", motor: 1, kulaklikGerekli: false, unlockLevel: 4, playable: false },
  { id: "hiz-modu", ad: "Hız Modu", aciklama: "60 saniyede kaç tane?", motor: 1, kulaklikGerekli: false, unlockLevel: 5, playable: false },
  { id: "db-seviyesi", ad: "dB Seviyesi", aciklama: "Kaç dB değişti?", motor: 1, kulaklikGerekli: false, unlockLevel: 6, playable: false },
  { id: "stereo-genislik", ad: "Stereo Genişlik", aciklama: "Ses ne kadar geniş?", motor: 1, kulaklikGerekli: true, unlockLevel: 7, playable: false },
  { id: "pan-konumu", ad: "Pan Konumu", aciklama: "Ses nereden geliyor?", motor: 1, kulaklikGerekli: true, unlockLevel: 8, playable: false },
  { id: "tonal-denge", ad: "Tonal Denge", aciklama: "Hangi bölge fazla?", motor: 1, kulaklikGerekli: false, unlockLevel: 9, playable: false },

  // ---- Motor 2 · Hangisi farklı ----
  { id: "hangisi-farkli", ad: "Hangisi Farklı", aciklama: "Üç sesten farklı olanı bul", motor: 2, kulaklikGerekli: false, unlockLevel: 10, playable: false },
  { id: "kompresor", ad: "Kompresör", aciklama: "Hangisi daha sıkıştırılmış?", motor: 2, kulaklikGerekli: false, unlockLevel: 12, playable: false },
  { id: "reverb", ad: "Reverb", aciklama: "Hangisinin reverb'i farklı?", motor: 2, kulaklikGerekli: true, unlockLevel: 14, playable: false },
  { id: "distortion", ad: "Distortion", aciklama: "Hangisi daha doygun?", motor: 2, kulaklikGerekli: false, unlockLevel: 16, playable: false },

  // ---- Motor 3 · İki kaynaklı ----
  { id: "frekans-cakismasi", ad: "Frekans Çakışması", aciklama: "Kick ve bas nerede çakışıyor?", motor: 3, kulaklikGerekli: false, unlockLevel: 20, playable: false }
];

// Motor numarasına göre görsel kimlik — mevcut renk paletinden (styles.css :root).
export const MOTOR_INFO = {
  1: { label: "Değeri bul", color: "var(--am)", bg: "rgba(255,176,32,.14)" },
  2: { label: "Hangisi farklı", color: "var(--bl)", bg: "rgba(108,140,255,.14)" },
  3: { label: "İki kaynaklı", color: "var(--pu)", bg: "rgba(168,85,247,.14)" }
};

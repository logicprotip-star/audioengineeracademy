// G102 — Kalıcı dosya depolama (Araçlar > Dosyalarım). İKİ ayrı implementasyon:
// (1) NATIVE — Capacitor'ın resmi @capacitor/filesystem plugin'i, Directory.
//     Data (iOS: Documents, Android: uygulamaya özel dosya alanı — uygulama
//     silinince silinir, kullanıcı içeriği için doğru kapsam) altında bir
//     alt klasöre BASE64 olarak yazıyor. Bu projenin YERLEŞİK deseniyle AYNI
//     (window.Capacitor.Plugins.* global erişimi, bkz. app.js:
//     getFilePickerPlugin/pickNativeAudioFile) — hiçbir ES-import/bundler
//     gerektirmiyor, native tarafta npx cap sync ile otomatik kayıt olur.
// (2) WEB (masaüstü/tarayıcı geliştirme, window.Capacitor YOK) — IndexedDB,
//     Blob'u DOĞRUDAN saklıyor (base64 dönüşümüne gerek yok, IndexedDB
//     Blob'u native destekliyor). Bu SADECE `python3 -m http.server`
//     ortamında geliştirme/test için — gerçek cihazda hiç kullanılmaz.
//
// "iOS kısıtı: uygulama başka bir dosyanın yolunu saklayıp sonradan o yoldan
// okuyamaz" — bu yüzden dosyanın KENDİSİ (yolu değil) buraya kopyalanıyor.

const FS_DIRECTORY = "DATA";
const FS_SUBDIR = "araclar-kutuphane";

function getFilesystemPlugin() {
  return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) || null;
}

function getFilePickerPlugin() {
  return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FilePicker) || null;
}

export function isNativeStorage() {
  return !!getFilesystemPlugin();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader hatası"));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

// ---- IndexedDB (web fallback) ----
const IDB_NAME = "eqEarTrainerFileStorage";
const IDB_STORE = "files";
let idbPromise = null;
function openIdb() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}
async function idbPut(id, blob) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(id) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbDelete(id) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// G104 — "dosya yükleyince Araçlar donuyor" (canlı iOS raporu) düzeltmesi.
// KÖK SEBEP ADAYI olarak base64+tek writeFile çağrısı işaret edilmişti;
// canlı ölçümde JS tarafındaki base64 dönüşümü/JSON boyutu TEK BAŞINA hızlı
// çıktı (bkz. DURUM.md G104), ama Capacitor'ın JS↔native köprüsünün TEK bir
// dev (onlarca MB) base64 string'i taşıması iyi belgelenmiş bir performans
// sorunu — bu yüzden büyük dosyalar PARÇA PARÇA yazılıyor: ilk parça
// writeFile(), geri kalanı appendFile() (plugin'in resmi API'si, definitions.
// d.ts'te doğrulandı) ile. Her parça KÜÇÜK bir bridge mesajı + kendi
// `await`'i sayesinde ana iş parçacığına DOĞAL bir nefes noktası oluyor.
//
// G107 — "32 MB dosyada arayüz donuyor" (canlı iOS konsol kanıtı: writeFile
// 1 kez + appendFile ARDIŞIK 8+ kez, her birinin data'sı base64 dize).
// KÖK SEBEP DOĞRULANDI: 4MB'lık ham parça base64'te ~5,5MB'a şişiyor, HER
// appendFile çağrısı bu devasa dizeyi JS↔native köprüsünden TEK mesajda
// taşıyor — köprü hem JS hem native tarafta bunu kopyalıyor (iyi belgelenmiş
// bir Capacitor performans sınırı, task'ın kendi teşhisiyle örtüşüyor).
// İKİ yol değerlendirildi:
//   YOL A (parça küçültme): NATIVE_WRITE_CHUNK_BYTES 4MB'tan 1MB'a çekildi —
//   base64 şişmesi ~1,4MB'a düşüyor, çağrı sayısı artıyor ama her mesaj
//   köprüden hızlı geçiyor.
//   YOL B (base64'ü tamamen atla): @capawesome/capacitor-file-picker'ın
//   KENDİ copyFile() metodu — plugin kaynağı (node_modules/@capawesome/
//   capacitor-file-picker/ios/Plugin/FilePicker.swift:17-39, android/.../
//   FilePicker.java:32-51) OKUNDU ve DOĞRULANDI: iOS'ta düz
//   `FileManager.copyItem(at:to:)`, Android'de `ContentResolver` stream
//   kopyası — HİÇBİR base64/JS-native köprü veri taşıması YOK. Kaynak yolu
//   (`picked.path`, app.js:pickNativeAudioFile) GÜVENLİ: aynı plugin'in
//   `pickFiles()` delegate'i (FilePicker.swift:303-310, `saveTemporaryFile`)
//   seçilen dosyayı DAHA ÖNCE uygulamanın kendi tmp/cache dizinine
//   kopyalamış oluyor — yani security-scoped resource erişimi GEREKMİYOR,
//   `picked.path` zaten uygulamanın kendi sandbox'ında.
// YOL B SEÇİLDİ (birincil), YOL A onun GÜVENLİ DÜŞÜŞÜ olarak KORUNDU —
// nativePath verilmemişse (ör. web `<input type=file>` yolu, native path
// yok) ya da FilePicker.copyFile plugin'de yoksa/başarısız olursa Yol A'ya
// düşülüyor. Android'de copyFile() hedefi FileProvider.getUriForFile() ile
// çözüyor (FilePicker.java:81) — bu, Directory.Data'nın (Android'de
// context.filesDir, bkz. @capacitor/filesystem LegacyFilesystemImplementation.
// kt:54) file_paths.xml'de bir <files-path> girdisiyle KAPSANMASINI
// gerektiriyor; bu G107'de EKLENDİ (android/app/src/main/res/xml/
// file_paths.xml) — eksik olsaydı copyFile Android'de HER ZAMAN
// başarısız olurdu.
// DÜRÜSTLÜK NOTU: hem Yol B'nin kaynak-doğrulaması hem file_paths.xml
// düzeltmesi statik kod/plugin kaynağı OKUNARAK yapıldı — bu ortamda gerçek
// iOS/Android cihaz YOK, bu yüzden runtime davranışı burada KANITLANAMADI
// (task'ın kendi notu — cihaz doğrulaması kullanıcıda). Yol A düşüşü TAM DA
// bu belirsizliğe karşı bir güvenlik ağı.
const NATIVE_WRITE_CHUNK_BYTES = 1 * 1024 * 1024; // G107: 4MB→1MB (Yol A) — bkz. yukarıdaki not
const FS_MKDIR_PATH = FS_SUBDIR;

// id: kütüphane manifestindeki dosya id'si (dosya adı ÇAKIŞMASINDAN bağımsız
// üretilir, bkz. app.js:toolsGenerateId). blob: File/Blob. onProgress(fraction):
// opsiyonel, 0..1 arası ilerleme — SADECE native/parçalı yolda birden fazla
// kez çağrılır (web/IndexedDB yolu zaten tek adımda hızlı, bkz. idbPut notu).
// nativePath: G107 — FilePicker'ın döndürdüğü uygulama-sandbox'ı İÇİNDEKİ
// gerçek dosya yolu (varsa). Verilirse Yol B (native copyFile) denenir.
export async function saveFile(id, blob, onProgress, nativePath) {
  const fs = getFilesystemPlugin();
  if (fs) {
    if (nativePath) {
      try {
        await saveFileNativeCopy(fs, id, nativePath, onProgress);
        return;
      } catch (e) {
        console.error("[file-storage] Yol B (native copyFile) başarısız, Yol A'ya (parçalı base64) düşülüyor:", e);
      }
    }
    await saveFileNativeChunked(fs, id, blob, onProgress);
  } else {
    await idbPut(id, blob);
    if (onProgress) onProgress(1);
  }
}

// G107 — Yol B: base64 köprüsü YOK, dosya native tarafta doğrudan kopyalanıyor.
async function saveFileNativeCopy(fs, id, nativePath, onProgress) {
  const filePicker = getFilePickerPlugin();
  if (!filePicker || typeof filePicker.copyFile !== "function") {
    throw new Error("FilePicker.copyFile mevcut değil");
  }
  const path = `${FS_SUBDIR}/${id}`;
  try {
    await fs.mkdir({ path: FS_MKDIR_PATH, directory: FS_DIRECTORY, recursive: true });
  } catch (e) {
    // Dizin zaten varsa (en yaygın durum, ilk dosyadan sonra) sessizce geç —
    // bu dosyanın diğer fonksiyonlarındaki (deleteFile/fileExists) AYNI
    // "yoksay ve devam et" deseni.
  }
  const { uri } = await fs.getUri({ path, directory: FS_DIRECTORY });
  if (onProgress) onProgress(0);
  await filePicker.copyFile({ from: nativePath, to: uri, overwrite: true });
  if (onProgress) onProgress(1);
}

async function saveFileNativeChunked(fs, id, blob, onProgress) {
  const path = `${FS_SUBDIR}/${id}`;
  const total = blob.size;
  if (total === 0) {
    await fs.writeFile({ path, data: "", directory: FS_DIRECTORY, recursive: true });
    if (onProgress) onProgress(1);
    return;
  }
  let offset = 0;
  let first = true;
  while (offset < total) {
    const end = Math.min(offset + NATIVE_WRITE_CHUNK_BYTES, total);
    const base64 = await blobToBase64(blob.slice(offset, end));
    if (first) {
      await fs.writeFile({ path, data: base64, directory: FS_DIRECTORY, recursive: true });
      first = false;
    } else {
      await fs.appendFile({ path, data: base64, directory: FS_DIRECTORY });
    }
    offset = end;
    if (onProgress) onProgress(offset / total);
  }
}

// Dönen: Blob | null (bulunamadı/okunamadı — sessizce null döner, çağıran
// taraf bunu "dosya eksik" olarak yorumlar, bkz. app.js bütünlük kontrolü).
export async function loadFile(id, mimeType) {
  const fs = getFilesystemPlugin();
  if (fs) {
    try {
      const res = await fs.readFile({ path: `${FS_SUBDIR}/${id}`, directory: FS_DIRECTORY });
      if (res.data instanceof Blob) return res.data; // web-implementasyonlu Filesystem (teoride)
      return base64ToBlob(res.data, mimeType);
    } catch (e) {
      return null;
    }
  } else {
    try {
      return await idbGet(id);
    } catch (e) {
      return null;
    }
  }
}

export async function deleteFile(id) {
  const fs = getFilesystemPlugin();
  if (fs) {
    try {
      await fs.deleteFile({ path: `${FS_SUBDIR}/${id}`, directory: FS_DIRECTORY });
    } catch (e) {
      // Zaten yoksa (ör. daha önce elle silinmiş) sessizce geç.
    }
  } else {
    try {
      await idbDelete(id);
    } catch (e) {}
  }
}

export async function fileExists(id) {
  const fs = getFilesystemPlugin();
  if (fs) {
    try {
      await fs.stat({ path: `${FS_SUBDIR}/${id}`, directory: FS_DIRECTORY });
      return true;
    } catch (e) {
      return false;
    }
  } else {
    try {
      const blob = await idbGet(id);
      return !!blob;
    } catch (e) {
      return false;
    }
  }
}

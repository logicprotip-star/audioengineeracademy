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
const NATIVE_WRITE_CHUNK_BYTES = 4 * 1024 * 1024; // 4MB — küçük köprü mesajları, sık nefes

// id: kütüphane manifestindeki dosya id'si (dosya adı ÇAKIŞMASINDAN bağımsız
// üretilir, bkz. app.js:toolsGenerateId). blob: File/Blob. onProgress(fraction):
// opsiyonel, 0..1 arası ilerleme — SADECE native/parçalı yolda birden fazla
// kez çağrılır (web/IndexedDB yolu zaten tek adımda hızlı, bkz. idbPut notu).
export async function saveFile(id, blob, onProgress) {
  const fs = getFilesystemPlugin();
  if (fs) {
    await saveFileNativeChunked(fs, id, blob, onProgress);
  } else {
    await idbPut(id, blob);
    if (onProgress) onProgress(1);
  }
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

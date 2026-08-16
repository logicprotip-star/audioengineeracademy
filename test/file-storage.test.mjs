// file-storage.js testleri: G246 (TUR710-PERF-ARAYUZ-15-08 bulgusu 🔴, iCloud
// yedek) — Directory.LIBRARY_NO_CLOUD'a geçiş + Directory.DATA (eski konum)
// fallback'i. Sahte bir Capacitor Filesystem plugin'i (in-memory, directory→
// path→base64 Map'i) kullanılıyor — gerçek native köprü yok, sadece
// file-storage.js'in HANGİ directory'e/directory'lerde ARADIĞI test ediliyor.

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as fileStorage from "../www/js/core/file-storage.js";

function installFilesystemMock(initial = {}) {
  // store: { [directory]: { [path]: base64String } }
  const store = { DATA: { ...(initial.DATA || {}) }, LIBRARY_NO_CLOUD: { ...(initial.LIBRARY_NO_CLOUD || {}) } };
  const calls = { writeFile: [], appendFile: [], readFile: [], deleteFile: [], stat: [], mkdir: [], getUri: [] };
  const Filesystem = {
    async mkdir({ directory }) { calls.mkdir.push(directory); },
    async getUri({ path, directory }) { calls.getUri.push(directory); return { uri: `file://${directory}/${path}` }; },
    async writeFile({ path, data, directory }) {
      calls.writeFile.push(directory);
      store[directory] = store[directory] || {};
      store[directory][path] = data;
      return { uri: `file://${directory}/${path}` };
    },
    async appendFile({ path, data, directory }) {
      calls.appendFile.push(directory);
      store[directory] = store[directory] || {};
      store[directory][path] = (store[directory][path] || "") + data;
    },
    async readFile({ path, directory }) {
      calls.readFile.push(directory);
      const data = store[directory] && store[directory][path];
      if (data === undefined) throw new Error(`ENOENT: ${directory}/${path}`);
      return { data };
    },
    async deleteFile({ path, directory }) {
      calls.deleteFile.push(directory);
      if (!store[directory] || store[directory][path] === undefined) throw new Error(`ENOENT: ${directory}/${path}`);
      delete store[directory][path];
    },
    async stat({ path, directory }) {
      calls.stat.push(directory);
      if (!store[directory] || store[directory][path] === undefined) throw new Error(`ENOENT: ${directory}/${path}`);
      return { size: store[directory][path].length };
    },
  };
  globalThis.window = { Capacitor: { Plugins: { Filesystem } } };
  globalThis.FileReader = FakeFileReader;
  return { store, calls };
}

function blobFromText(text) {
  return { size: text.length, arrayBuffer: async () => new TextEncoder().encode(text).buffer, slice: (a, b) => blobFromText(text.slice(a, b)) };
}

// Node'da FileReader yok — blobToBase64() (file-storage.js) bunu KULLANIYOR,
// minimal bir shim: blob.arrayBuffer()'ı base64 data-URL'e çevirip onload'ı
// tetikler (gerçek tarayıcı FileReader'ının DÖNDÜRDÜĞÜ biçimle AYNI).
class FakeFileReader {
  readAsDataURL(blob) {
    Promise.resolve(blob.arrayBuffer()).then((buf) => {
      const b64 = Buffer.from(buf).toString("base64");
      this.result = `data:application/octet-stream;base64,${b64}`;
      if (this.onload) this.onload();
    }).catch((err) => {
      this.error = err;
      if (this.onerror) this.onerror();
    });
  }
}

describe("file-storage.js — G246: Directory.LIBRARY_NO_CLOUD'a yazma, Directory.DATA'ya (eski) okuma/silme fallback'i", () => {
  beforeEach(() => {
    globalThis.window = undefined;
  });

  it("saveFile() SADECE LIBRARY_NO_CLOUD'a yazar, DATA'ya hiç dokunmaz", async () => {
    const { store, calls } = installFilesystemMock();
    await fileStorage.saveFile("id1", blobFromText("x"), null, null);
    assert.ok(Object.keys(store.LIBRARY_NO_CLOUD).length > 0, "LIBRARY_NO_CLOUD'a yazılmalı");
    assert.equal(Object.keys(store.DATA).length, 0, "DATA'ya HİÇ yazılmamalı");
    assert.ok(calls.writeFile.every((d) => d === "LIBRARY_NO_CLOUD"), "writeFile HER ZAMAN LIBRARY_NO_CLOUD'a çağrılmalı");
  });

  it("loadFile() YENİ konumda (LIBRARY_NO_CLOUD) bir dosya varsa DOĞRUDAN onu döner, DATA'ya hiç bakmaz", async () => {
    const { calls } = installFilesystemMock({ LIBRARY_NO_CLOUD: { "araclar-kutuphane/id1": "aGVsbG8=" } });
    const blob = await fileStorage.loadFile("id1", "audio/wav");
    assert.ok(blob, "dosya bulunmalı");
    assert.deepEqual(calls.readFile, ["LIBRARY_NO_CLOUD"], "DATA'ya hiç fallback denenmemeli — YENİ konumda zaten bulundu");
  });

  it("loadFile() YENİ konumda YOKSA (G246 ÖNCESİ yüklenmiş dosya) ESKİ konuma (DATA) düşer — dosya KAYBOLMAZ", async () => {
    const { calls } = installFilesystemMock({ DATA: { "araclar-kutuphane/legacy1": "bGVnYWN5" } });
    const blob = await fileStorage.loadFile("legacy1", "audio/wav");
    assert.ok(blob, "eski konumdaki dosya HÂLÂ bulunmalı — G246 ÖNCESİ kullanıcılar dosyalarını KAYBETMEMELİ");
    assert.deepEqual(calls.readFile, ["LIBRARY_NO_CLOUD", "DATA"], "önce YENİ, sonra ESKİ konum denenmeli");
  });

  it("loadFile() HİÇBİR konumda yoksa null döner (çökmez)", async () => {
    installFilesystemMock();
    const blob = await fileStorage.loadFile("olmayan-id", "audio/wav");
    assert.equal(blob, null);
  });

  it("fileExists() loadFile() ile AYNI iki-konum sırasını izler", async () => {
    installFilesystemMock({ DATA: { "araclar-kutuphane/legacy2": "eA==" } });
    assert.equal(await fileStorage.fileExists("legacy2"), true, "eski konumdaki dosya 'var' sayılmalı");
    assert.equal(await fileStorage.fileExists("hic-yok"), false);
  });

  it("deleteFile() dosya HANGİ konumda olursa olsun (yeni/eski) İKİSİNİ de dener, gerçekten silinir", async () => {
    const { store, calls } = installFilesystemMock({
      LIBRARY_NO_CLOUD: { "araclar-kutuphane/newFile": "eA==" },
      DATA: { "araclar-kutuphane/oldFile": "eQ==" },
    });
    await fileStorage.deleteFile("newFile");
    await fileStorage.deleteFile("oldFile");
    assert.equal(store.LIBRARY_NO_CLOUD["araclar-kutuphane/newFile"], undefined, "yeni konumdaki dosya silinmeli");
    assert.equal(store.DATA["araclar-kutuphane/oldFile"], undefined, "eski konumdaki dosya da silinmeli");
    // Her deleteFile çağrısı İKİ konumu da dener (biri ENOENT verse bile sessizce geçilir).
    assert.ok(calls.deleteFile.includes("LIBRARY_NO_CLOUD") && calls.deleteFile.includes("DATA"));
  });

  it("deleteFile() dosya HİÇBİR konumda yoksa sessizce geçer, hata FIRLATMAZ", async () => {
    installFilesystemMock();
        await assert.doesNotReject(fileStorage.deleteFile("olmayan-id"));
  });
});

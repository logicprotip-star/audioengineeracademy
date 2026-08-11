// upload.js pause/resume offset testleri (G12) — AudioBufferSourceNode gerçek
// pause/resume desteklemediği için elle takip edilen offset/startedAt aritmetiğini
// doğrular. Gerçek bir AudioContext yerine sahte bir saat (setTime ile ileri
// alınabilen currentTime) kullanan minimal bir stub kuruluyor — decodeAudioData ve
// createBufferSource'un GERÇEK ses işlemi yapmayan, sadece çağrı argümanlarını
// kaydeden sahte sürümleri.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createUploadManager } from "../www/js/core/upload.js";

function makeFakeCtx(bufferDuration) {
  let currentTime = 0;
  const fakeBuffer = { duration: bufferDuration };
  return {
    get currentTime() { return currentTime; },
    setTime(t) { currentTime = t; },
    decodeAudioData: async () => fakeBuffer,
    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        startedAtOffset: null,
        start(_when, offset) { this.startedAtOffset = offset; }
      };
    }
  };
}

const fakeFile = { name: "test.wav", arrayBuffer: async () => new ArrayBuffer(8) };

describe("upload.js pause/resume offset hesabı (G12)", () => {
  it("start → pausePlayback() → getSourceNode(): dondurulmuş offset'ten devam eder, GEÇEN GERÇEK SÜREYİ eklemez", async () => {
    const ctx = makeFakeCtx(20);
    const mgr = createUploadManager(() => ctx);
    const res = await mgr.loadFile(fakeFile);
    assert.equal(res.ok, true);

    ctx.setTime(0);
    const node1 = mgr.getSourceNode();
    assert.equal(node1.startedAtOffset, 0); // ilk çalma baştan

    ctx.setTime(5); // 5 saniye gerçekten çaldı
    mgr.pausePlayback(); // burada donmalı (bkz. audio-engine.js stopAudio())

    // "Geri bildirim ekranı" boyunca 25 saniye GERÇEK zaman geçiyor ama ses çalmıyor —
    // bu sürenin offset'e YANSIMAMASI gerekiyor (G12'den önceki bug tam olarak buydu).
    ctx.setTime(30);

    const node2 = mgr.getSourceNode(); // "oyuna dönüş" / bir sonraki tur
    assert.equal(node2.startedAtOffset, 5, "30 saniyeye değil, duraklatıldığı 5. saniyeye dönmeli");
  });

  it("pausePlayback() ÇAĞRILMAZSA (eski hatalı davranış) offset gerçek geçen süreyle sürüklenir — regresyon karşılaştırması için", async () => {
    const ctx = makeFakeCtx(20);
    const mgr = createUploadManager(() => ctx);
    await mgr.loadFile(fakeFile);

    ctx.setTime(0);
    mgr.getSourceNode();
    ctx.setTime(30); // pausePlayback() ÇAĞRILMADAN 30 saniye "gerçek zaman" geçti
    const node = mgr.getSourceNode();
    // playing hâlâ true olduğu için offset 0+30=30, 20sn'lik buffer'a göre mod alınır → 10
    assert.equal(node.startedAtOffset, 10, "pause çağrılmazsa offset gerçek süreyle ilerlemeye devam eder (beklenen eski davranış)");
  });

  it("duraklatılan offset buffer süresini aşarsa modulo ile doğru sarılır", async () => {
    const ctx = makeFakeCtx(10);
    const mgr = createUploadManager(() => ctx);
    await mgr.loadFile(fakeFile);

    ctx.setTime(0);
    mgr.getSourceNode();
    ctx.setTime(23); // 10sn'lik buffer'ı 2 kez sarıp 3sn daha çalmış gibi
    mgr.pausePlayback();

    ctx.setTime(23); // hemen devam et
    const node = mgr.getSourceNode();
    assert.ok(Math.abs(node.startedAtOffset - 3) < 1e-9, `beklenen ~3, alınan ${node.startedAtOffset}`);
  });

  it("startFromZero(): duraklatılmış offset'i sıfırlar (yeni oturum/Tekrar Oyna)", async () => {
    const ctx = makeFakeCtx(20);
    const mgr = createUploadManager(() => ctx);
    await mgr.loadFile(fakeFile);

    ctx.setTime(0);
    mgr.getSourceNode();
    ctx.setTime(8);
    mgr.pausePlayback();

    mgr.startFromZero();
    ctx.setTime(8); // zaman ilerlemiş olsa da startFromZero offset'i 0'a çekti
    const node = mgr.getSourceNode();
    assert.equal(node.startedAtOffset, 0);
  });

  it("art arda pausePlayback() çağrıları (stopAudio() birden fazla kez tetiklense de) offset'i BOZMAZ", async () => {
    // buildQuestionChain her çağrıldığında ÖNCE stopAudio() çalışır (activeUploadManager
    // üzerinden pausePlayback() tetiklenir) — bir turda birden fazla kez tetiklenmesi
    // (ör. karşılaştırma önizlemesi + tur geçişi) offset'i yanlışlıkla ilerletmemeli.
    const ctx = makeFakeCtx(20);
    const mgr = createUploadManager(() => ctx);
    await mgr.loadFile(fakeFile);

    ctx.setTime(0);
    mgr.getSourceNode();
    ctx.setTime(4);
    mgr.pausePlayback();
    ctx.setTime(9); // hâlâ duraklatılmış haldeyken tekrar pausePlayback() çağrılırsa (no-op olmalı)
    mgr.pausePlayback();

    const node = mgr.getSourceNode();
    assert.equal(node.startedAtOffset, 4, "ikinci pausePlayback() çağrısı playing=false olduğu için no-op olmalı, offset 4'te kalmalı");
  });

  // G123 — "dosya seçimi mod başına": app.js artık TEK bir paylaşılan
  // uploadManager'ı BAĞLAMLAR (Araçlar + her mod) arasında geçiş yaparken
  // clear() ile boşaltıp başka bir dosyayla yeniden dolduruyor (bkz.
  // ensureUploadSelectionLoaded). clear()'ın hasBuffer'ı GERÇEKTEN false'a
  // çektiğini ve offset/playing durumunu sıfırladığını doğrular.
  it("clear(): hasBuffer'ı false'a çeker, offset/playing sıfırlanır (bağlam geçişinde 'yanlış dosya' sızıntısı olmasın)", async () => {
    const ctx = makeFakeCtx(20);
    const mgr = createUploadManager(() => ctx);
    await mgr.loadFile(fakeFile);
    assert.equal(mgr.hasBuffer, true);

    ctx.setTime(0);
    mgr.getSourceNode();
    ctx.setTime(7);

    mgr.clear();
    assert.equal(mgr.hasBuffer, false, "clear() sonrası hasBuffer false olmalı");
    assert.equal(mgr.getBuffer(), null);
  });

  it("clear() sonrası TEKRAR loadFile() ile yeni bir dosya (BAŞKA bir bağlamınmış gibi) baştan çalar — eski offset SIZMAZ", async () => {
    const ctx = makeFakeCtx(20);
    const mgr = createUploadManager(() => ctx);
    await mgr.loadFile(fakeFile);
    ctx.setTime(0);
    mgr.getSourceNode();
    ctx.setTime(12);
    mgr.clear();

    const res2 = await mgr.loadFile(fakeFile);
    assert.equal(res2.ok, true);
    ctx.setTime(12); // zaman ilerlemiş olsa da YENİ dosya baştan başlamalı
    const node = mgr.getSourceNode();
    assert.equal(node.startedAtOffset, 0, "clear()+loadFile() sonrası eski offset (12) SIZMAMALI, 0'dan başlamalı");
  });
});

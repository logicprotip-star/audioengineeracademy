// Ses zinciri kurulumu ve yönetimi: AudioContext/analyser/masterGain/muteGain,
// kaynak üretimi (gürültü/synth/örnek dosya), mute/unmute (A/B bypass), stopAudio.
// Bir modun filtre/EQ zincirini nasıl kurduğunu BİLMEZ — bunun için applyProcessing
// callback'i alır (bkz. modes/*.js: applyProcessing(question, { audioCtx })).

import { findSource } from "./source-catalog.js";

const MUTE_RAMP_SEC = 0.05; // ~50ms — Durdur/Tekrar Çal arasındaki geçiş
// G33: stopAudio()'nun eski zincir söndürme zaman sabiti (0.03) node.stop()'un
// sabit gecikmesine (0.08sn) göre GEVŞEKTİ — setTargetAtTime asimptotik
// olduğu için 80ms'de gain hâlâ ~%7 seviyesindeydi, sonra node.stop() bunu
// SERT kesiyordu — bu, ZİNCİRİN HER YENİDEN KURULUŞUNDA (buildQuestionChain
// HER ÇAĞRILDIĞINDA) duyulabilir bir tıklama riski taşıyordu. Diğer beş modda
// bu SEYREK tetiklenir (tur başına bir kez) ama Kompresör'ün A/B/C döngüsü
// (her ~2sn'de) VE önizleme butonu HER basışta buildQuestionChain'i YENİDEN
// çağırıyor — aynı gevşek söndürme, Kompresör'de ÇOK daha sık duyulur hale
// geliyordu ("ses/kaynak değişince kesiklik" — kullanıcı raporu). Zaman
// sabiti sıkılaştırıldı (0.03→0.012) — .stop() ateşlendiğinde gain artık
// ~%0.1'e inmiş oluyor (pratikte sessiz), .stop()'un KENDİ zamanlaması
// (now+0.08) DEĞİŞMEDİ — hiçbir modun round geçiş SÜRESİ etkilenmiyor,
// sadece söndürme EĞRİSİ daha SIKI.
const STOP_RAMP_TIME_CONSTANT = 0.012;
// G58 — G33'ün "tam kulak doğrulaması açık" notuna göre kod tarafı yeniden
// denetlendi: KÖK SEBEP G33'te tam çözülmemiş — zaman sabiti SIKILAŞTIRILMIŞTI
// ama stopAudio() aynı forEach adımında node.gain'e ramp-down PROGRAMLADIKTAN
// HEMEN SONRA node.disconnect()'i SENKRON (aynı JS tick'inde, now'da) çağırıyordu.
// Web Audio'da disconnect() ANINDA etkilidir — programlanan gain eğrisi
// (setTargetAtTime) sesin ÇIKIŞ noktasına artık hiç ULAŞAMIYOR, yani ramp
// FİİLEN DUYULMUYORDU, ne kadar sıkı programlanırsa programlansın (0.03 ya da
// 0.012 fark etmezdi — ikisi de "duyulmayan" bir eğriydi). Bu, ÖZELLİKLE
// Kompresör'ün A/B/C döngüsünün her ~2sn'de bir buildQuestionChain→stopAudio
// çağırdığı yerde SIK tekrarlanan bir sert kesme demekti. Düzeltme: disconnect()
// artık ANINDA değil, ramp'in GERÇEKTEN duyulabilir olması için yeterli bir
// gecikmeyle (.stop()'un kendi now+0.08 zamanlamasından SONRA) planlanıyor —
// ses artık GERÇEKTEN söner, SONRA bağlantı kesilir.
const DISCONNECT_DELAY_MS = 100;

export function createAudioEngine() {
  let audioCtx = null;
  let analyser = null;
  let masterGain = null;
  let muteGain = null;
  let audioReady = false;
  let audioUnlocked = false;
  let currentNodes = [];
  let onReady = null; // audioReady olduğunda bir kere çağrılır (ör. drawVisualizer'ı başlatmak için)
  // A/B kuru/işlenmiş crossfade gain'leri (bkz. buildQuestionChain/setProcessed) — bir
  // sonraki buildQuestionChain çağrısına kadar geçerli, o an aktif zincire ait.
  let dryGain = null;
  let wetGain = null;
  // G12: "upload" kaynağı aktifken buildQuestionChain'in geçirdiği uploadManager
  // referansı — SADECE stopAudio()'nun onu duraklatabilmesi için tutuluyor (bkz.
  // stopAudio). Kaynak upload DEĞİLSE null'a çekilir; böylece stopAudio() gömülü/
  // sentetik kaynaklarda hiçbir şey yapmaz (davranışları BOZULMAZ).
  let activeUploadManager = null;
  // G51 — Motor 3 (Frekans Çakışması): buildDualSourceChain'in kullandığı İKİ
  // (opsiyonel) uploadManager referansı — activeUploadManager'ın (TEKİL,
  // diğer sekiz modun kullandığı) AYNI amaçla ama ÇOĞUL hali. Diğer sekiz
  // modda HER ZAMAN boş dizi kalır (stopAudio()'daki ek döngü hiçbir şey
  // yapmaz) — TEK davranış değişikliği bu dizinin BOŞ OLMAMASI durumunda.
  let activeUploadManagers = [];
  // Dual-source zincirinin filtre/gain referansları — dryGain/wetGain'in AYNI
  // "bir sonraki buildDualSourceChain'e kadar geçerli" deseni (bkz. setDualCut/
  // setDualSolo).
  let dualFilterA = null, dualFilterB = null, dualGainA = null, dualGainB = null;

  // G131 — CİHAZDA KANITLANDI: G130'un "state==='running'" doğrulaması
  // YETERSİZ çıktı. Cihaz günlüğü: resume() "başarılı" olup state
  // running'e döndükten SONRA bile currentTime 13+ saniye boyunca HİÇ
  // ilerlemedi — context nominal olarak açık ama iOS ses donanımını
  // GERÇEKTE geri devretmemiş ("zombi" context). Tek güvenilir kanıt:
  // currentTime'ın GERÇEKTEN ilerlediği. Ayrıca (araştırma + kullanıcının
  // kendi kararı): iOS'ta context'i GERÇEK ANLAMDA canlandırmak/yeniden
  // oluşturmak SADECE bir kullanıcı jesti (gerçek dokunuş/tıklama) İÇİNDE
  // güvenilir — bu yüzden context yeniden oluşturma SADECE jest-tetikli
  // giriş noktalarından (playQuestion, Tools/kalibrasyon play düğmeleri —
  // hepsi bir click handler'ının İÇİNDE çalışır) izin veriliyor,
  // visibilitychange gibi SİSTEM olaylarından DEĞİL (bkz. ensureAudioAlive'ın
  // allowRecreate parametresi) — jest DIŞI bir yeniden oluşturma denemesi
  // hem muhtemelen İŞE YARAMAZ hem boşuna 2 hakkımızdan birini tüketir.
  // G133 — CİHAZDA KANITLANDI: mekanizmanın KENDİSİ (tespit → yeniden
  // oluşturma → doğrulama) DOĞRU çalışıyordu — cihaz günlüğü HER seferinde
  // "yeniden oluşturuldu → canlı: true → ses geldi" gösteriyordu. Sorun
  // SADECE sınırdı: MAX_CONTEXT_RECREATE=2, UYGULAMA ÖMRÜ boyunca (üçüncü
  // kesintiden sonra kullanıcı BİR DAHA ses alamıyordu). Safari'nin sayfa
  // başına sınırı EŞZAMANLI AÇIK context sayısıdır (~4), TOPLAM oluşturma
  // sayısı DEĞİL — close()'un GERÇEKTEN tamamlandığı doğrulanırsa (aşağıda,
  // artık await ediliyor) yüksek bir toplam sayı GÜVENLİDİR. 20'ye çıkarıldı
  // (yaklaşık sınırsız — bir kullanıcı oturumunda 20 kesinti gerçekçi
  // değil) — asıl güvenlik ağı artık RECREATE_COOLDOWN_MS (hız sınırı,
  // sonsuz/çılgın döngüyü engeller) ve inFlightEnsure (kilit, eşzamanlı
  // yarışı engeller).
  const MAX_CONTEXT_RECREATE = 20;
  const RECREATE_COOLDOWN_MS = 2000; // en fazla 2 saniyede 1 yeniden oluşturma denemesi
  let lastRecreateAttemptAt = 0;
  let contextRecreateCount = 0;
  let audioDead = false; // true = state "running" OLSA BİLE currentTime ilerlemiyor, GERÇEK dokunuş bekleniyor
  let onDeadStateChange = null; // app.js "Devam etmek için ekrana dokunun" banner'ını göster/gizle
  let onContextRecreated = null; // app.js'in yüklü dosyaları YENİ context'e göre yeniden decode etmesi için
  // G133 — "aynı anda birden fazla yeniden oluşturma çalışmasın" (task'ın
  // kendi isteği): ensureAudioAlive() halihazırda DEVAM EDEN bir çağrı
  // varken (ör. native sessionActivated olayı VE bir play denemesi neredeyse
  // aynı anda tetiklenirse) YENİ bir tane BAŞLATMAZ, mevcut olanın SONUCUNU
  // paylaşır — iki paralel recreateContext() birbirinin ayaklarına
  // basmasın (ikisi de aynı anda contextRecreateCount'u artırıp aynı
  // audioCtx'i İKİ KEZ close() etmeye çalışmasın).
  let inFlightEnsure = null;
  // G137 — inFlightEnsure hangi allowRecreate ile başladığını da saklar.
  // Bunsuz, visibilitychange'in SESSİZ (allowRecreate:false) kontrolü tam o
  // sırada devam ederken kullanıcı play'e basarsa, GERÇEK jestin kendi
  // ensureAudioAlive(allowRecreate:true) çağrısı ESKİ (zayıf) sonucu
  // MİRAS ALIYORDU — jestin recreateContext HAKKI sessizce harcanmadan
  // kayboluyordu (cihazda GÖZLENEN "Atla'ya basmak zorunda kalma"nın olası
  // bir sebebi). Aşağıdaki ensureAudioAlive() artık bunu ayırt eder.
  let inFlightAllowRecreate = true;

  function setAudioDead(dead) {
    if (audioDead === dead) return;
    audioDead = dead;
    if (onDeadStateChange) onDeadStateChange(dead);
  }

  // G132/G134 — iOS'a ÖZGÜ native köprü (ios/App/App/AudioSessionPlugin.swift
  // + MainViewController.swift). ARAŞTIRMA BULGUSU: Web Audio'nun resume()'u
  // WKWebView'in ALTINDAKİ AVAudioSession'ı YÖNETMEZ — Apple'ın kendi
  // "Responding to Interruptions" belgesi kesintiden sonra AVAudioSession.
  // setActive(true) ile YENİDEN etkinleştirme GEREKTİRİYOR, JS'in tek
  // başına yapamayacağı bir adım.
  //
  // G135 — CİHAZDA KANITLANDI (G134'ün DÜZELTMESİ TAM İŞLEMEDİ): bu köprünün
  // GLOBAL `window.Capacitor` nesnesinde `registerPlugin` DİYE BİR FONKSİYON
  // HİÇ YOK (cihaz ölçümü — `TypeError: is not a function`). Bu köprü
  // (bundler'sız, düz `<script>` ile yüklenen `capacitor.js`) `@capacitor/
  // core`'un YENİ (registerPlugin tabanlı) JS API'sini DEĞİL, DAHA ALÇAK
  // seviyeli/eski native-bridge yüzeyini (`nativePromise`/`nativeCallback`/
  // `toNative`/`isPluginAvailable`/... — cihazda `Object.keys(Capacitor)`
  // ile TAM listesi çıkarıldı) sunuyor. `Capacitor.nativePromise(pluginName,
  // methodName, options)` GERÇEKTEN çalıştığı cihazda DOĞRUDAN ölçüldü:
  // `Capacitor.nativePromise('AudioSessionPlugin','activate',{})` → `{"ok":
  // true}`. Native taraf (AudioSessionPlugin.swift + MainViewController.swift,
  // G132/G134) HER ZAMAN doğru çalışıyordu — Xcode konsolunda
  // `[audio-diag-native]` satırları HEP görünüyordu; SORUN SADECE JS'in
  // YANLIŞ (var olmayan) bir fonksiyonu çağırmaya çalışmasıydı.
  let audioSessionPluginInstance = null;
  function getAudioSessionPlugin() {
    if (audioSessionPluginInstance) return audioSessionPluginInstance;
    if (!window.Capacitor) return null;
    const platform = window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : null;
    if (platform !== "ios") return null;
    // isPluginAvailable + nativePromise'in VARLIĞI ayrı ayrı kontrol
    // edilir — task'ın kendi isteği: "erişilebilirlik kontrolü
    // isPluginAvailable ile yapılsın; nativePromise'in varlığı da
    // kontrol edilsin." Native taraf (MainViewController.swift)
    // GERÇEKTEN kayıt etmediyse isPluginAvailable false döner — bu
    // durumda "plugin BULUNAMADI" artık GERÇEK yokluğu gösterir (eski
    // registerPlugin() ARAMASI hep başarısız olduğu için HER ZAMAN
    // "yok" diyordu, native'in kendisi kayıtlı olsa BİLE).
    if (typeof window.Capacitor.nativePromise !== "function") return null;
    if (window.Capacitor.isPluginAvailable && !window.Capacitor.isPluginAvailable("AudioSessionPlugin")) return null;
    // registerPlugin()'in ürettiği ".activate()"/".addListener()" içeren
    // zengin proxy'nin YERİNE, SADECE cihazda DOĞRULANMIŞ nativePromise
    // çağrısını saran KÜÇÜK/minimal bir sarmalayıcı — olay dinleyicileri
    // (sessionActivated/interruptionBegan) BİLEREK buraya DAHİL EDİLMEDİ
    // (bkz. wireNativeAudioSessionEvents'in G135 notu — bu turun kapsamı
    // DIŞINDA, native→JS proaktif bildirim AYRI/doğrulanmamış bir API
    // yüzeyi gerektirir).
    audioSessionPluginInstance = {
      activate: () => window.Capacitor.nativePromise("AudioSessionPlugin", "activate", {}),
    };
    return audioSessionPluginInstance;
  }
  // SIRALAMA (task'ın kendi isteği): "önce native oturum, sonra Web Audio
  // resume" — bu fonksiyon ensureAudioAlive()'ın EN BAŞINDA (resume denemesi
  // BAŞLAMADAN ÖNCE) çağrılır.
  //
  // G133 — "native katman görünmüyor" teşhisi: Swift'in KENDİ `print()`'i
  // Xcode'un konsoluna gider, Safari Web Inspector'a DEĞİL (ikisi AYRI
  // süreç/console) — `[audio-diag-native]` satırları Safari'de HİÇBİR ZAMAN
  // görünmeyecek, bu BEKLENEN/doğru davranış, hata DEĞİL. JS tarafında
  // plugin'in GERÇEKTEN bulunup çağrıldığının kanıtı BURADAKİ `[audio-diag]`
  // satırları — önceden plugin BULUNAMAZSA (ör. cihaza henüz senkronlanmamış
  // bir build) SESSİZCE dönüyordu, HİÇBİR İZ bırakmıyordu; artık "plugin
  // BULUNAMADI" da ayrıca loglanıyor. Ayrıca native çağrı (herhangi bir
  // sebeple) hiç yanıt vermezse (asla resolve/reject etmezse) TÜM
  // ensureAudioAlive() zinciri SONSUZA kadar askıda kalırdı (bu, "Tekrar
  // dene" ve tüm sonraki play denemelerinin SESSİZCE tepkisiz kalmasının
  // olası bir açıklaması) — 2 saniyelik bir zaman aşımıyla bu artık
  // İMKANSIZ, native yanıt vermese bile JS akışı devam eder.
  async function activateNativeSession(reason) {
    const plugin = getAudioSessionPlugin();
    if (!plugin) {
      console.log(`[audio-diag] native AVAudioSession plugin BULUNAMADI (${reason}) — window.Capacitor yok/iOS değil/nativePromise yok/isPluginAvailable('AudioSessionPlugin') false (Web/Android'de NORMAL; iOS'ta görüyorsan native taraf GERÇEKTEN kayıtlı değil demektir — MainViewController.swift/registerPluginInstance'ı kontrol et)`);
      return;
    }
    const t0 = performance.now();
    try {
      const res = await Promise.race([
        plugin.activate(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("native activate() 2000ms içinde yanıt vermedi (zaman aşımı)")), 2000))
      ]);
      console.log(`[audio-diag] native AVAudioSession activate() (${reason}) — ${(performance.now() - t0).toFixed(0)}ms, ok=${res && res.ok}`);
    } catch (e) {
      console.log(`[audio-diag] native AVAudioSession activate() HATA (${reason}) — ${(performance.now() - t0).toFixed(0)}ms — ${e && e.message}`);
    }
  }

  async function tryResumeOnce(label) {
    if (!audioCtx || audioCtx.state === "running") return;
    const before = audioCtx.state;
    const t0 = performance.now();
    console.log(`[audio-diag] resume çağrılıyor (${label}) — öncesi state=${before}`);
    try {
      await audioCtx.resume();
      console.log(`[audio-diag] resume sonucu (${label}) — ${(performance.now() - t0).toFixed(0)}ms sonra state=${audioCtx.state}`);
    } catch (e) {
      console.log(`[audio-diag] resume HATA (${label}) — ${e && e.message}`);
    }
  }

  // currentTime GERÇEKTEN ilerliyor mu — TEK güvenilir "context canlı mı"
  // testi (bkz. dosya başı G131 notu). 120ms: sağlıklı bir context'te bu
  // sürede currentTime KESİNLİKLE ölçülebilir şekilde ilerler (gerçek
  // zamanlı ses saati); donuk/zombi bir context'te İKİ okuma BİREBİR AYNI
  // kalır (yaklaşık değil, tam eşit — kısmi bir "yavaş ama ilerliyor"
  // durumu YOK, ya akıyor ya TAMAMEN donmuş).
  const LIVENESS_WAIT_MS = 120;
  async function checkLiveness() {
    if (!audioCtx) return false;
    const before = audioCtx.currentTime;
    await new Promise((r) => setTimeout(r, LIVENESS_WAIT_MS));
    const after = audioCtx.currentTime;
    const alive = after > before;
    console.log(`[audio-diag] currentTime ilerleme kontrolü — ${before.toFixed(3)}s → ${after.toFixed(3)}s (${LIVENESS_WAIT_MS}ms bekleme) — canlı: ${alive}`);
    return alive;
  }

  // Context'i KAPATIP YENİDEN kurar — SADECE ensureAudioAlive'ın
  // allowRecreate=true dalından (yani bir kullanıcı jesti İÇİNDEN)
  // çağrılır. En fazla MAX_CONTEXT_RECREATE kez (uygulama ömrü boyunca,
  // sıfırlanmaz) VE en fazla RECREATE_COOLDOWN_MS'de bir (hız sınırı —
  // task'ın kendi isteği: "sonsuz döngü oluşmasın").
  // unlockAudio()'nun context+node kurulum bloğu audioReady=false ile
  // ZORLA yeniden çalıştırılıyor — kod TEKRARLANMADI.
  async function recreateContext() {
    if (contextRecreateCount >= MAX_CONTEXT_RECREATE) {
      console.log(`[audio-diag] bağlam yeniden oluşturma İPTAL — üst sınıra (${MAX_CONTEXT_RECREATE}) ulaşıldı`);
      return false;
    }
    const sinceLastAttempt = performance.now() - lastRecreateAttemptAt;
    if (sinceLastAttempt < RECREATE_COOLDOWN_MS) {
      console.log(`[audio-diag] bağlam yeniden oluşturma İPTAL — hız sınırı (son denemeden ${sinceLastAttempt.toFixed(0)}ms geçti, en az ${RECREATE_COOLDOWN_MS}ms gerekiyor)`);
      return false;
    }
    lastRecreateAttemptAt = performance.now();
    contextRecreateCount++;
    console.log(`[audio-diag] bağlam YENİDEN OLUŞTURULUYOR (${contextRecreateCount}/${MAX_CONTEXT_RECREATE})`);
    const oldCtx = audioCtx;
    // Aktif turun/önizlemenin TÜM düğümleri eski (zombi) bağlama ait —
    // yeni bağlama TAŞINAMAZLAR (AudioNode context'e bağlıdır), sadece
    // referansları temizlenir. Bir sonraki buildQuestionChain/play denemesi
    // ZATEN sıfırdan kurma deseninde olduğu için (bkz. dosya başı yorumlar)
    // bu güvenli.
    currentNodes = [];
    dryGain = null; wetGain = null;
    activeUploadManager = null; activeUploadManagers = [];
    dualFilterA = null; dualFilterB = null; dualGainA = null; dualGainB = null;
    // AudioBuffer'lar (kullanıcının kendi araştırma kararı — WebKit'te
    // cross-context paylaşımı GÜVENİLMEZ kabul edildi): gömülü örnek
    // önbelleği temizlenir, bir sonraki kullanımda YENİ context'le YENİDEN
    // decode edilir (buildSampleSource zaten cache-miss'te bunu yapıyor,
    // kod tekrarlanmadı). Kullanıcının YÜKLEDİĞİ dosya(lar) audio-engine.js
    // kapsamı DIŞINDA (app.js'in uploadManager'ları) — onContextRecreated
    // hook'uyla app.js'e haber verilir (bkz. altındaki not).
    sampleBufferCache.clear();
    audioReady = false;
    audioUnlocked = false;
    // G133 — task'ın kendi isteği: close()'un GERÇEKTEN çağrıldığı VE
    // TAMAMLANDIĞI artık AÇIKÇA doğrulanıyor (öncesi/sonrası log + süre).
    // ÖNCEDEN await edilmiyordu ("jest'ten mümkün olduğunca az async adımla
    // ayrılmak için") — cihaz kanıtı bunun GEREKSİZ bir endişe olduğunu
    // gösterdi: mekanizma fire-and-forget haliyle bile İKİ kez üst üste
    // (1/2, 2/2) sorunsuz çalıştı. await etmek Safari'nin EŞZAMANLI açık
    // context sınırına (~4) daha da saygılı davranır — bir SONRAKİ
    // context'i oluşturmadan ÖNCE eskisinin GERÇEKTEN kapandığından emin
    // oluruz, üst üste yığılan "kapanıyor" context'ler BİRİKMEZ (bu, 20'ye
    // çıkarılan toplam sınırın GÜVENLİ olmasının ÖN KOŞULU).
    if (oldCtx) {
      const closeT0 = performance.now();
      console.log("[audio-diag] eski bağlam close() çağrılıyor");
      try {
        await oldCtx.close();
        console.log(`[audio-diag] eski bağlam close() TAMAMLANDI — ${(performance.now() - closeT0).toFixed(0)}ms, state=${oldCtx.state}`);
      } catch (e) {
        console.log(`[audio-diag] eski bağlam close() HATA — ${(performance.now() - closeT0).toFixed(0)}ms — ${e && e.message}`);
      }
    }
    unlockAudio(); // audioCtx/analyser/masterGain/muteGain YENİDEN kurulur (TAZE AudioContext)
    // G132 — TAZE context için native oturumun da TAZE etkin olduğundan
    // emin ol (ensureAudioAlive'ın kendi başındaki çağrısı bu noktaya
    // gelmeden ÖNCE zaten bir kez denemişti — bu, ekstra bir güvence,
    // native activate() idempotent/ucuz).
    await activateNativeSession("recreateContext");
    await tryResumeOnce("bağlam yeniden oluşturma");
    const alive = await checkLiveness();
    console.log(`[audio-diag] bağlam yeniden oluşturma sonucu — canlı: ${alive}`);
    if (onContextRecreated) onContextRecreated();
    return alive;
  }

  function unlockAudio() {
    // Mobil (özellikle iOS) için: ilk kullanıcı dokunuşunda context'i aç,
    // sessiz bir buffer çalıp kilidini aç, resume et.
    if (!audioReady) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      // Varsayılan .8 çok yumuşatıyor (çubuklar pürüzsüz azalan bir eğri gibi
      // görünüyordu, "canlı" hissettirmiyordu) — düşürünce görsel tepki hızlanır.
      analyser.smoothingTimeConstant = 0.4;
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.82;
      // Kalıcı susturma node'u: "Durdur" artık hiçbir kaynağı/filtreyi durdurmuyor,
      // sadece bunu 0'a rampalıyor — ses arka planda kesintisiz akmaya devam ediyor,
      // "Tekrar Çal" da sadece bunu geri açıyor.
      muteGain = audioCtx.createGain();
      muteGain.gain.value = 1;
      muteGain.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
      // [audio-diag] KALICI TEŞHİS GÜNLÜĞÜ (task'ın kendi isteği — DÜZELTME
      // YOK, sadece görünürlük). iOS/WebKit'te AudioContext.state standart
      // "suspended/running/closed"a EK olarak "interrupted" da alabilir
      // (telefon çağrısı/Siri/başka bir uygulamanın ses oturumunu ele
      // alması gibi durumlarda) — statechange TEK, güvenilir sinyal, HER
      // geçişte (kimin tetiklediğinden bağımsız) ateşlenir.
      let audioDiagLastState = audioCtx.state;
      audioCtx.onstatechange = () => {
        console.log(`[audio-diag] statechange — ${audioDiagLastState} → ${audioCtx.state} (currentTime=${audioCtx.currentTime.toFixed(2)})`);
        audioDiagLastState = audioCtx.state;
      };
      audioReady = true;
      if (onReady) onReady();
    }
    // G130 — HER dokunuşta çalışan (pointerdown/touchend/click/keydown,
    // aşağıdaki kalıcı dinleyiciler) EN UCUZ/en basit kurtarma denemesi —
    // BİLEREK "running" DIŞINDAKİ her durumda (suspended/interrupted)
    // tek, doğrulanmamış bir resume() dener. GERÇEK/doğrulanmış kurtarma
    // (currentTime kontrolü + gerekirse context yeniden oluşturma,
    // G131) BURADA DEĞİL — playQuestion/initAudio gibi GERÇEK bir play
    // denemesine bağlı, ensureAudioAlive() üzerinden yapılır (bkz. o
    // fonksiyonun notu — HER dokunuşta ağır bir 120ms+ doğrulama yapmak
        // sağlıklı normal kullanımda gereksiz gecikme eklerdi).
    if (audioCtx.state !== "running") {
      console.log(`[audio-diag] resume çağrılıyor (unlockAudio/dokunuş) — öncesi state=${audioCtx.state}`);
      audioCtx.resume().then(
        () => console.log(`[audio-diag] resume sonucu (unlockAudio/dokunuş) — state=${audioCtx.state}`),
        (e) => console.log(`[audio-diag] resume HATA (unlockAudio/dokunuş) — ${e && e.message}`)
      );
    }
    if (!audioUnlocked) {
      // sessiz 1 örneklik buffer — iOS kilidini kırar
      try {
        const b = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
        const s = audioCtx.createBufferSource();
        s.buffer = b; s.connect(audioCtx.destination); s.start(0);
        audioUnlocked = true;
      } catch (e) {}
    }
  }

  // İlk dokunuş/tıklamada sesi kilitten çıkar (bir kez)
  ["pointerdown", "touchend", "click", "keydown"].forEach(ev => {
    window.addEventListener(ev, unlockAudio, { once: false, passive: true });
  });

  // G131 — TEK, paylaşılan "context GERÇEKTEN canlı mı" doğrulama+kurtarma
  // giriş noktası. Sırasıyla: (0 — G132) native AVAudioSession'ı etkinleştir
  // ("Sıralama önemli: önce native oturum, sonra Web Audio resume" —
  // task'ın kendi kuralı), (1) kısa gecikmeli BİRKAÇ resume denemesi
  // (G130'dan), (2) currentTime ilerleme kontrolü (G131 — state=running
  // TEK BAŞINA GÜVENİLMEZ, cihazda kanıtlandı), (3) HÂLÂ ölüyse VE
  // allowRecreate=true İSE (yani bir kullanıcı jesti İÇİNDE çağrılıyorsa —
  // playQuestion/Tools/kalibrasyon play düğmeleri, HEPSİ click handler'ı
  // içinde) context KAPATILIP YENİDEN kurulur (bkz. recreateContext).
  // visibilitychange SİSTEM olayı olduğu için allowRecreate=false ile
  // çağırır — SADECE resume dener+doğrular, context YENİDEN OLUŞTURMAZ.
  // Dönüş değeri: çağıran taraf BUNU kontrol ETMEDEN ses zinciri
  // KURMAMALI/başlatmamalı (eski sessiz başarısızlık — "zincir kuruldu,
  // play başladı" yazıp context'in GERÇEKTE donuk kalması — buradan
  // kapatılıyor).
  const RESUME_RETRY_DELAYS_MS = [0, 150, 400];
  // G133 — "aynı anda birden fazla yeniden oluşturma çalışmasın" (kilit):
  // ensureAudioAlive() ZATEN DEVAM EDEN bir çağrı varken YENİ bir tane
  // BAŞLATMAZ, aynı sonucu BEKLEYİP paylaşır. Dışa açık isim AYNI kaldı
  // (mevcut TÜM çağıranlar — playQuestion, Tools/kalibrasyon play
  // düğmeleri, visibilitychange, native sessionActivated dinleyicisi —
  // değişiklik GEREKTİRMEDİ), gerçek iş ensureAudioAliveInner()'da.
  // G137 — `silent`: `setAudioDead()`'i (dolayısıyla "Devam etmek için
  // ekrana dokunun" banner'ını) HİÇ tetiklemez — sadece native
  // etkinleştirme+resume+canlılık kontrolünü SESSİZCE dener. SADECE
  // visibilitychange'in "visible" dalından (bir kullanıcı jesti DEĞİL,
  // banner göstermek task'ın bu turki isteğine göre YANLIŞ) kullanılır.
  // GERÇEK bir play denemesi (playQuestion/initAudio, ikisi de silent
  // GEÇMEZ) sonucu HER ZAMAN normal şekilde banner'a yansır.
  async function ensureAudioAlive(opts = {}) {
    const allowRecreate = opts.allowRecreate !== false;
    if (inFlightEnsure) {
      if (allowRecreate && !inFlightAllowRecreate) {
        // Bekleyen çağrı allowRecreate:false (sessiz kontrol) — GERÇEK bir
        // jest onun sonucunu MİRAS ALMAMALI. Önce onu bekle; hâlâ ölüyse
        // KENDİ (allowRecreate:true, banner'a bağlı) denemesini başlat.
        const prevAlive = await inFlightEnsure;
        if (prevAlive) return true;
      } else {
        return inFlightEnsure;
      }
    }
    inFlightAllowRecreate = allowRecreate;
    inFlightEnsure = ensureAudioAliveInner({ ...opts, allowRecreate }).finally(() => { inFlightEnsure = null; });
    return inFlightEnsure;
  }
  async function ensureAudioAliveInner({ allowRecreate = true, silent = false } = {}) {
    if (!audioCtx) return false;
    await activateNativeSession("ensureAudioAlive");
    for (let i = 0; i < RESUME_RETRY_DELAYS_MS.length; i++) {
      if (audioCtx.state === "running") break;
      if (RESUME_RETRY_DELAYS_MS[i] > 0) await new Promise((r) => setTimeout(r, RESUME_RETRY_DELAYS_MS[i]));
      await tryResumeOnce(`deneme ${i + 1}/${RESUME_RETRY_DELAYS_MS.length}`);
    }
    let alive = await checkLiveness();
    if (!alive && allowRecreate) {
      alive = await recreateContext();
    }
    if (!silent) setAudioDead(!alive);
    return alive;
  }

  // [audio-diag] Araçlar/kalibrasyon/A-B önizleme dahil, `initAudio()`'dan
  // geçen HER çalma denemesi burada tek kontrol noktasından loglanır (bkz.
  // ayrıca app.js:playQuestion'ın KENDİ ayrı log'u — o bu fonksiyonu
  // ÇAĞIRMIYOR, ensureAudioAlive()'ı doğrudan kendisi çağırıyor). Dönüş
  // değeri — çağıran ARTIK context'in GERÇEKTEN (currentTime'ı ilerleyerek)
  // canlı olduğunu doğrulayabilir.
  async function initAudio() {
    unlockAudio();
    if (audioCtx) {
      console.log(`[audio-diag] play denemesi (initAudio) — state=${audioCtx.state}, currentTime=${audioCtx.currentTime.toFixed(2)}`);
    }
    return await ensureAudioAlive();
  }

  // G132/G135 — native'in KENDİ proaktif bildirimlerini (uygulama öne
  // gelince/kesinti bitince JS'i UYARMASI, "sessionActivated"/
  // "interruptionBegan") dinlemek İÇİN G132'de `plugin.addListener(...)`
  // kullanılmıştı — ama bu, HİÇ VAR OLMAYAN `Capacitor.registerPlugin()`'in
  // ürettiği (varsayılan) proxy'nin bir metoduydu, cihazda BAŞTAN BERİ
  // sessizce no-op'tu (bkz. G135'in `getAudioSessionPlugin` notu). Bu turda
  // KAPSAM BİLEREK DAR TUTULDU (task'ın kendi "YAPILACAK" listesi SADECE
  // activate()/erişilebilirlik/log'u kapsıyordu) — cihazda DOĞRULANMIŞ
  // TEK yüzey `nativePromise` (tek seferlik çağrı-yanıt), olay dinleme
  // (`addListener`/`removeListener`, üst düzey `Capacitor` nesnesinde VAR
  // ama pluginName+eventName imzası bu turda DOĞRULANMADI) AYRI bir
  // araştırma/turun konusu. FONKSİYONEL KAYIP YOK: JS zaten HER play
  // denemesinde (playQuestion/Tools/kalibrasyon) VE her `visibilitychange`
  // olayında `ensureAudioAlive()` üzerinden `activateNativeSession()`'ı
  // ÇAĞIRIYOR — kaybedilen SADECE "native'in kendisi JS'i bir play
  // denemesinden ÖNCE proaktif olarak uyarması" hız avantajı, doğruluk
  // DEĞİL.

  // --- ses efektleri: doğru = ding, yanlış = buzz ---
  function sfxDing() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g); g.connect(audioCtx.destination);
      const s = t + i * 0.08;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.16, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      o.start(s); o.stop(s + 0.24);
    });
  }

  function sfxBuzz() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.28);
    o2.type = "square"; o2.frequency.setValueAtTime(100, t); o2.frequency.exponentialRampToValueAtTime(55, t + 0.28);
    o.connect(g); o2.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.start(t); o2.start(t); o.stop(t + 0.34); o2.stop(t + 0.34);
  }

  // "Durdur" — hiçbir kaynağı/node'u durdurmaz, sadece kalıcı çıkış gain'ini kısa
  // bir rampayla 0'a indirir.
  function muteOutput() {
    if (!audioCtx || !muteGain) return;
    const now = audioCtx.currentTime;
    muteGain.gain.cancelScheduledValues(now);
    muteGain.gain.setValueAtTime(muteGain.gain.value, now);
    muteGain.gain.linearRampToValueAtTime(0.0001, now + MUTE_RAMP_SEC);
  }

  function unmuteOutput() {
    if (!audioCtx || !muteGain) return;
    const now = audioCtx.currentTime;
    muteGain.gain.cancelScheduledValues(now);
    muteGain.gain.setValueAtTime(muteGain.gain.value, now);
    muteGain.gain.linearRampToValueAtTime(1, now + MUTE_RAMP_SEC);
  }

  function stopAudio() {
    if (!audioCtx) return;
    // G12: fiziksel durdurmayla AYNI anda upload'ın MANTIKSAL çalma konumunu da
    // duraklat — aksi halde AudioBufferSourceNode gerçekten susar ama uploadManager
    // hâlâ "çalıyor" sanıp bir sonraki getSourceNode() çağrısında geçen GERÇEK
    // (duvar saati) süreyi offset'e ekler; kullanıcı cevap verip geri bildirimde
    // kaldığı süre kadar şarkı "ileri sarılmış" gibi görünürdü (bkz. DURUM.md G12).
    if (activeUploadManager) activeUploadManager.pausePlayback();
    // G51: dual-source (Motor 3) İKİ uploadManager'ı olabilir — diğer sekiz
    // modda bu dizi HER ZAMAN boş, döngü hiçbir şey yapmaz (davranış BİREBİR
    // aynı kalır).
    activeUploadManagers.forEach(m => { if (m) m.pausePlayback(); });
    dualFilterA = null; dualFilterB = null; dualGainA = null; dualGainB = null;
    const now = audioCtx.currentTime;
    currentNodes.forEach(node => {
      try {
        if (node.gain && node.gain.cancelScheduledValues) {
          node.gain.cancelScheduledValues(now);
          node.gain.setTargetAtTime(0.0001, now, STOP_RAMP_TIME_CONSTANT);
        }
      } catch {}
      try {
        // MediaElementAudioSourceNode'un .stop() metodu yok — bu kendisini etkilemez,
        // sadece node.disconnect() ile filtre zincirinden ayrılır (element çalmaya devam eder).
        if (node.stop) node.stop(now + 0.08);
      } catch {}
    });
    // G58: disconnect() artık BU forEach içinde SENKRON çağrılmıyor — SENKRON
    // çağrı, yukarıda programlanan gain ramp'ini (ve .stop()'un now+0.08
    // zamanlamasını) FİİLEN duyulmaz kılıyordu (bkz. dosya başı
    // DISCONNECT_DELAY_MS notu). Aynı node referans listesi (closure ile)
    // ramp+stop GERÇEKTEN bittikten SONRA temizleniyor — sessizliğe erişildiği
    // İÇİN artık işitilir bir kesme YOK, sadece gecikmeli bir temizlik.
    const nodesToDisconnect = currentNodes;
    setTimeout(() => {
      nodesToDisconnect.forEach(node => {
        try { if (node.disconnect) node.disconnect(); } catch {}
      });
    }, DISCONNECT_DELAY_MS);
    currentNodes = [];
    dryGain = null;
    wetGain = null;
  }

  function buildNoiseSource(sourceType) {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (sourceType === "pink") {
        last = 0.985 * last + 0.015 * white;
        data[i] = last * 2.5;
      } else {
        data[i] = white * 0.7;
      }
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start();
    return [noise];
  }

  // ---- örnek (dosya) tabanlı kaynaklar — XMLHttpRequest(arraybuffer) + decodeAudioData +
  // AudioBufferSourceNode (sentetik kaynakların ZATEN kullandığı yol). İki ayrı sorun tek
  // tek çözüldü: (1) fetch() WKWebView'da yerel bundle dosyasını çekemiyordu ("HTTP 0") —
  // XMLHttpRequest (arraybuffer response) aynı işi yerel dosyalarda da görüyor, fetch()
  // KULLANILMIYOR. (2) HTMLAudioElement (bir önceki commit) HTTP 0'ı çözdü ama iOS'ta
  // kesik kesik çaldı ve loop noktasında tıklama/boşluk vardı — streaming/element tabanlı
  // çalma kısa ve hassas zamanlamalı döngüler için uygun değil. AudioBufferSourceNode
  // kusursuz loop + örnek-hassas zamanlama sağlıyor. Kaynaklar küçük (en büyüğü ~130 KB/
  // 5.6sn) — decodeAudioData burada RAM riski TAŞIMIYOR (upload.js'in BÜYÜK kullanıcı
  // dosyaları için bu yoldan kaçınmasıyla çelişmiyor, o farklı bir ölçek — bkz. upload.js
  // başındaki not). AudioBuffer path başına decode edilip CACHE'lenir (immutable, paylaşımı
  // güvenli) — ama her turda YİNE DE yeni bir AudioBufferSourceNode oluşturulur, "kalıcı
  // graf mutasyonu yok" kuralı bozulmaz (sentetik kaynaklarla aynı desen).
  const sampleBufferCache = new Map(); // path -> Promise<AudioBuffer>, decode SADECE BİR KEZ
  function loadSampleBuffer(path) {
    if (sampleBufferCache.has(path)) return sampleBufferCache.get(path);
    const promise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", path, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = () => {
        if (xhr.status !== 0 && xhr.status !== 200) {
          reject(new Error(`Örnek yüklenemedi: ${path} (HTTP ${xhr.status})`));
          return;
        }
        audioCtx.decodeAudioData(
          xhr.response,
          resolve,
          err => reject(err instanceof Error ? err : new Error(`Örnek decode edilemedi: ${path}`))
        );
      };
      xhr.onerror = () => reject(new Error(`Örnek yüklenemedi: ${path} (ağ hatası)`));
      xhr.send();
    });
    // Başarısız denemeyi cache'leme — bir sonraki seçimde yeniden denensin (ör. dosya
    // sonradan eklendi).
    promise.catch(() => sampleBufferCache.delete(path));
    sampleBufferCache.set(path, promise);
    return promise;
  }
  async function buildSampleSource(path) {
    const buffer = await loadSampleBuffer(path);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return [src];
  }

  function buildSynthSource(sourceType) {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    const g2 = audioCtx.createGain();

    osc1.type = sourceType;
    osc2.type = sourceType === "square" ? "triangle" : "sine";
    osc1.frequency.value = 110;
    osc2.frequency.value = 220;
    g1.gain.value = 0.52;
    g2.gain.value = 0.34;

    osc1.connect(g1);
    osc2.connect(g2);
    osc1.start();
    osc2.start();

    return { nodes: [osc1, osc2, g1, g2], outputs: [g1, g2] };
  }

  const CROSSFADE_SEC = 0.05; // ~50ms — MUTE_RAMP_SEC ile aynı, tıklamasız geçiş

  // question: mod tarafından üretilmiş soru nesnesi (createQuestion çıktısı).
  // processed: başlangıç durumu (true=işlenmiş/wet, false=temiz/dry) — filtre zinciri
  // ARTIK HER ZAMAN kuruluyor, sadece hangi yolun başlangıçta duyulur olduğunu belirliyor
  // (bkz. aşağıdaki dryGain/wetGain paralel yollar). A/B arasında geçiş artık BU
  // fonksiyonu tekrar çağırmıyor — setProcessed() ile SADECE gain crossfade yapılıyor,
  // kaynak/filtre grafiği bir kez kurulup tur boyunca hiç bozulmuyor.
  // uploadManager: upload.js'in döndürdüğü nesne (varsa) — "upload" kaynağı için HER
  // ÇAĞRIDA uploadManager.getSourceNode() ile TAZE bir AudioBufferSourceNode istenir
  // (gömülü örneklerle AYNI node tipi — bkz. G8, DURUM.md E1: iki farklı source-node
  // tipinin karışması iOS'ta ses motorunu kilitliyordu). Pozisyon upload.js içinde
  // elle takip edildiği için kaldığı yerden devam eder.
  // applyProcessing: aktif modun applyProcessing(question, { audioCtx }) fonksiyonu.
  async function buildQuestionChain(question, processed, sourceType, uploadManager, applyProcessing) {
    let sampleLoadFailed = false;
    stopAudio(); // ÖNCEKİ zincirin (varsa) upload konumunu duraklatır — bkz. activeUploadManager notu
    // Bu turun kaynağı upload İSE stopAudio()'nun bir SONRAKİ çağrısı bunu duraklatabilsin
    // diye referans burada güncelleniyor; değilse null (gömülü/sentetik kaynaklarda
    // stopAudio() hiçbir şey yapmaz).
    activeUploadManager = sourceType === "upload" ? uploadManager : null;

    // Güvenlik: bir önceki durum (Durdur) muteGain'i 0'da bırakmış olabilir; yeni bir
    // soru/round zinciri kuruluyorsa duyulabilir olmalı.
    if (muteGain) {
      const now = audioCtx.currentTime;
      muteGain.gain.cancelScheduledValues(now);
      muteGain.gain.setValueAtTime(1, now);
    }

    const out = audioCtx.createGain();
    out.gain.value = 0.0001;
    out.gain.exponentialRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);

    const sourceMix = audioCtx.createGain();
    sourceMix.gain.value = 1;

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 22;
    compressor.ratio.value = 2.2;

    // Filtreler artık KOŞULSUZ kuruluyor (processed=false'ta bile) — wet yol her zaman
    // hazır bekliyor, A/B toggle'ı sadece gain crossfade ile arasında geçiyor.
    const processingResult = applyProcessing(question, { audioCtx });
    const filters = processingResult.filters || [];
    // G118 (Stereo Genişlik) — TEK EKLENTİ NOKTASI: `filters` dizisi SADECE DÜZ
    // bir SERİ zincir kurabiliyor (`wetNode.connect(f); wetNode=f`, aşağıda AYNEN
    // korundu) — bir modun kaynağı İÇERDE ikiye ayırıp (fan-out) farklı işleyip
    // SONRA birleştirmesi (branching) bu döngüyle KURULAMAZ: ARA elemanlar arasına
    // audio-engine HER ZAMAN ek bir doğrudan bağlantı da ekler, bu da fan-out'un
    // İÇİNDEN geçmeyen istenmeyen bir "bypass" kopyası sızdırır (elle doğrulandı).
    // `branch` bu YÜZDEN AYRI bir kanal: mod kendi ALT-GRAFİĞİNİ (fan-out+birleştir
    // dahil) TAMAMEN kendi içinde kurup SADECE giriş/çıkış uçlarını (`input`/
    // `output`) dışa verir — audio-engine SADECE `sourceMix→input` ve
    // `output→localWetGain` bağlar, `filters` dizisiyle AYNI anda kullanılmaz
    // (branch varsa filters YOK SAYILIR, bkz. aşağıdaki if). Diğer 10 mod
    // `branch` HİÇ döndürmez (undefined) — bu blok onlar için TAMAMEN devre dışı,
    // davranışları BİR SATIR değişmedi.
    const branch = processingResult.branch || null;

    const localDryGain = audioCtx.createGain();
    const localWetGain = audioCtx.createGain();
    localDryGain.gain.value = processed ? 0.0001 : 1;
    localWetGain.gain.value = processed ? 1 : 0.0001;
    dryGain = localDryGain;
    wetGain = localWetGain;

    currentNodes.push(out, sourceMix, compressor, localDryGain, localWetGain, ...(branch ? branch.nodes : filters));

    if (sourceType === "upload" && uploadManager && uploadManager.hasBuffer) {
      const node = uploadManager.getSourceNode();
      if (node) {
        node.connect(sourceMix);
        currentNodes.push(node);
      }
    } else if (sourceType === "pink" || sourceType === "white") {
      const [noise] = buildNoiseSource(sourceType);
      noise.connect(sourceMix);
      currentNodes.push(noise);
    } else if (findSource(sourceType)?.kind === "sample") {
      const samplePath = findSource(sourceType).samplePath;
      try {
        const [sample] = await buildSampleSource(samplePath);
        // stopAudio() bu zincirin kurulumu sırasında (decode beklerken) başka bir
        // soru/tur başladıysa currentNodes'u zaten temizlemiş olabilir — o zaman bu
        // node'u YİNE DE bağlamak eski bir zinciri diriltir. Zincirin hâlâ güncel
        // olduğunu currentNodes referansı üzerinden doğrula.
        if (currentNodes.includes(out)) {
          sample.connect(sourceMix);
          currentNodes.push(sample);
        } else {
          sample.stop();
        }
      } catch (err) {
        console.error(err);
        // G90 (madde 10): fallback (pink noise) DAVRANIŞI DEĞİŞMEDİ — round
        // sessiz kalmasın diye hâlâ bir kaynak bağlanıyor. YENİ olan sadece
        // bu bilginin çağırana (app.js) DÖNÜLMESİ, "Ses yüklenemedi · Tekrar
        // dene" satırını gösterebilsin diye (bkz. playQuestion).
        sampleLoadFailed = true;
        const [noise] = buildNoiseSource("pink");
        noise.connect(sourceMix);
        currentNodes.push(noise);
      }
    } else {
      const { nodes, outputs } = buildSynthSource(sourceType);
      outputs.forEach(o => o.connect(sourceMix));
      currentNodes.push(...nodes);
    }

    // Yalnızca örnek-dosya dalında gerçek bir await gecikmesi var — o sırada
    // stopAudio() başka bir tur tarafından çağrılmış olabilir. Böyle bir durumda bu
    // zincirin geri kalanını (filtre/compressor/muteGain bağlantısı) KURMA, yoksa
    // eski/öksüz bir zincir sessizce arka planda çalmaya başlar.
    if (!currentNodes.includes(out)) return { sampleLoadFailed };

    // Paralel kuru/işlenmiş yollar — İKİSİ DE her zaman bağlı, aralarında SADECE
    // localDryGain/localWetGain'in değeri (0.0001 ↔ 1) geçiş yapıyor. setProcessed()
    // bu ikisini crossfade eder; kaynak (sourceMix) veya filtreler bir daha ASLA
    // disconnect/reconnect edilmez.
    sourceMix.connect(localDryGain);
    localDryGain.connect(compressor);

    if (branch) {
      sourceMix.connect(branch.input);
      branch.output.connect(localWetGain);
    } else {
      let wetNode = sourceMix;
      filters.forEach(f => { wetNode.connect(f); wetNode = f; });
      wetNode.connect(localWetGain);
    }
    localWetGain.connect(compressor);

    compressor.connect(out);
    out.connect(muteGain);
    return { sampleLoadFailed };
  }

  // A/B toggle — ARTIK grafiği yeniden kurmuyor, sadece dryGain/wetGain arasında kısa
  // bir crossfade yapıyor. Kaynak (özellikle canlı çalan MediaElementAudioSourceNode)
  // hiç dokunulmadan çalmaya devam ediyor.
  function setProcessed(processed) {
    if (!audioCtx || !dryGain || !wetGain) return;
    const now = audioCtx.currentTime;
    const [d, w] = processed ? [0.0001, 1] : [1, 0.0001];
    dryGain.gain.cancelScheduledValues(now);
    dryGain.gain.setValueAtTime(dryGain.gain.value, now);
    dryGain.gain.linearRampToValueAtTime(d, now + CROSSFADE_SEC);
    wetGain.gain.cancelScheduledValues(now);
    wetGain.gain.setValueAtTime(wetGain.gain.value, now);
    wetGain.gain.linearRampToValueAtTime(w, now + CROSSFADE_SEC);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // G51 — Motor 3 (Frekans Çakışması): buildQuestionChain'in TEK-kaynak varsayımı
  // (bkz. o fonksiyonun dosya başı notu) İKİ kaynağın AYNI ANDA çalması gereken
  // bu modu KARŞILAYAMAZ. Bu bölüm TAMAMEN AYRI/EK bir yol — buildQuestionChain'e
  // TEK SATIR dokunulmadı, diğer sekiz modun ses zinciri BİREBİR aynı kalıyor.
  //
  // sourcesSpec: { a: {sourceType, uploadManager}, b: {sourceType, uploadManager} }
  // — sourceType HER ZAMAN SOURCE_GROUPS'un/buildNoiseSource'un/buildSynthSource'un
  // ANLADIĞI bir id ("upload" DAHİL) — Motor 3'ün "upload-a"/"upload-b" gibi
  // sanal çift-id'lerini ÇÖZMEK (hangi uploadManager'a karşılık geldiğini
  // bulmak) app.js'in işi, bu fonksiyon SADECE hazır bir {sourceType,
  // uploadManager} çifti bekler (diğer sekiz modun buildQuestionChain'i NASIL
  // çağırdığıyla AYNI sorumluluk sınırı).
  //
  // applyProcessing(question, {audioCtx}) → { filterA, filterB } — HER İKİSİ
  // DE KOŞULSUZ kurulur (buildQuestionChain'in "filtreler her zaman kuruluyor"
  // ilkesinin AYNISI), gain=0 ile başlar ("önce" — maskeleme HÂLÂ orada).
  // setDualCut() SADECE doğru kaynağın filtresini negatif gaine çeker ("sonra").
  async function buildDualSourceChain(question, sourcesSpec, applyProcessing) {
    stopAudio();
    activeUploadManagers = [sourcesSpec.a.uploadManager, sourcesSpec.b.uploadManager].filter(Boolean);

    if (muteGain) {
      const now = audioCtx.currentTime;
      muteGain.gain.cancelScheduledValues(now);
      muteGain.gain.setValueAtTime(1, now);
    }

    const out = audioCtx.createGain();
    out.gain.value = 0.0001;
    out.gain.exponentialRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 22;
    compressor.ratio.value = 2.2;

    const { filterA, filterB } = applyProcessing(question, { audioCtx });
    const gainA = audioCtx.createGain(); gainA.gain.value = 1;
    const gainB = audioCtx.createGain(); gainB.gain.value = 1;
    dualGainA = gainA; dualGainB = gainB;
    dualFilterA = filterA; dualFilterB = filterB;

    currentNodes.push(out, compressor, gainA, gainB, filterA, filterB);

    // buildQuestionChain'in TEK-kaynak dalının (upload/noise/sample/synth)
    // AYNI mantığı — SADECE hedef gain/filter node'u parametre olarak alıyor,
    // İKİ kez (A ve B için) çağrılıyor.
    const connectSource = async (spec, gainNode, filterNode) => {
      if (spec.sourceType === "upload" && spec.uploadManager && spec.uploadManager.hasBuffer) {
        const node = spec.uploadManager.getSourceNode();
        if (node) { node.connect(gainNode); currentNodes.push(node); }
      } else if (spec.sourceType === "pink" || spec.sourceType === "white") {
        const [noise] = buildNoiseSource(spec.sourceType);
        noise.connect(gainNode);
        currentNodes.push(noise);
      } else if (findSource(spec.sourceType)?.kind === "sample") {
        const samplePath = findSource(spec.sourceType).samplePath;
        try {
          const [sample] = await buildSampleSource(samplePath);
          if (currentNodes.includes(out)) {
            sample.connect(gainNode);
            currentNodes.push(sample);
          } else {
            sample.stop();
          }
        } catch (err) {
          console.error(err);
          const [noise] = buildNoiseSource("pink");
          noise.connect(gainNode);
          currentNodes.push(noise);
        }
      } else {
        const { nodes, outputs } = buildSynthSource(spec.sourceType);
        outputs.forEach(o => o.connect(gainNode));
        currentNodes.push(...nodes);
      }
      gainNode.connect(filterNode);
      filterNode.connect(compressor);
    };

    await Promise.all([connectSource(sourcesSpec.a, gainA, filterA), connectSource(sourcesSpec.b, gainB, filterB)]);

    // buildQuestionChain'deki AYNI güvenlik: await sırasında (örnek-dosya
    // dalı) başka bir tur stopAudio() çağırmış olabilir — bu zincirin
    // GÜNCEL olduğunu currentNodes referansı üzerinden doğrula.
    if (!currentNodes.includes(out)) return;

    compressor.connect(out);
    out.connect(muteGain);
  }

  // AŞAMA 3'ün "önce/sonra" karşılaştırması — dryGain/wetGain crossfade'inin
  // AYNI ruhu ama İKİ AYRI filtre üzerinde: doğru kaynağın filtresi 0→
  // gainDb'ye, DİĞERİ HER ZAMAN 0'a ramplanır (setTargetAtTime, tıklama
  // riski yok — STOP_RAMP_TIME_CONSTANT'la AYNI yumuşaklık mertebesi).
  function setDualCut(sourceKey, gainDb) {
    if (!audioCtx) return;
    const target = sourceKey === "a" ? dualFilterA : dualFilterB;
    const other = sourceKey === "a" ? dualFilterB : dualFilterA;
    const now = audioCtx.currentTime;
    if (target) { target.gain.cancelScheduledValues(now); target.gain.setTargetAtTime(gainDb, now, 0.05); }
    if (other) { other.gain.cancelScheduledValues(now); other.gain.setTargetAtTime(0, now, 0.05); }
  }

  // AŞAMA 1/2'nin dinleme kontrolü ("Kick"/"Bas"/"İkisi birlikte") — muteGain'in
  // AYNI kısa crossfade'i (CROSSFADE_SEC), kaynak/filtre grafiği HİÇ bozulmadan.
  function setDualSolo(which) {
    if (!audioCtx || !dualGainA || !dualGainB) return;
    const now = audioCtx.currentTime;
    const [a, b] = which === "a" ? [1, 0.0001] : which === "b" ? [0.0001, 1] : [1, 1];
    [[dualGainA, a], [dualGainB, b]].forEach(([g, v]) => {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(v, now + CROSSFADE_SEC);
    });
  }

  return {
    unlockAudio,
    initAudio,
    ensureAudioAlive,
    sfxDing,
    sfxBuzz,
    muteOutput,
    unmuteOutput,
    stopAudio,
    buildQuestionChain,
    setProcessed,
    buildDualSourceChain,
    setDualCut,
    setDualSolo,
    set onReady(fn) { onReady = fn; },
    // G131 — app.js "Devam etmek için ekrana dokunun" banner'ını buradan
    // yönetir (fn(dead: boolean)) — context'in "gerçekten canlı değil,
    // dokunuş bekleniyor" durumu değiştiğinde SADECE bir kez çağrılır.
    set onDeadStateChange(fn) { onDeadStateChange = fn; },
    // G131 — context yeniden oluşturulunca (recreateContext) app.js'in
    // KENDİ uploadManager'larındaki (eski context'e ait) AudioBuffer'ları
    // yeni context'e göre yeniden yüklemesi için — audio-engine.js bu
    // nesnelere erişemiyor (app.js'in sahipliğinde), bu yüzden bir
    // BİLDİRİM/hook, doğrudan çağrı DEĞİL.
    set onContextRecreated(fn) { onContextRecreated = fn; },
    get audioDead() { return audioDead; },
    get contextRecreateCount() { return contextRecreateCount; },
    get audioCtx() { return audioCtx; },
    get analyser() { return analyser; },
    get audioReady() { return audioReady; }
  };
}

//
//  AudioSessionPlugin.swift
//
//  G132 — iOS'a ÖZGÜ (Android'e HİÇ dokunulmadı). JS tarafı (audio-engine.js)
//  Web Audio'nun resume()/currentTime'ına dayanıyor ama bunlar WKWebView'in
//  ALTINDAKİ AVAudioSession'ı YÖNETMİYOR — cihazda kanıtlanan "state=running
//  ama currentTime donuk" ("zombi context") belirtisi TAM OLARAK bunun
//  sonucu. Apple'ın kendi "Responding to Interruptions" belgesi: kesintiden
//  sonra uygulamanın AVAudioSession'ı setActive(true) ile YENİDEN
//  etkinleştirmesi GEREKİR — Web Audio'nun resume()'u bunu YAPMAZ, sadece
//  JS'in KENDİ (WKWebView içi) ses düğümlerini "devam ettirmeye" çalışır.
//
//  WKWebView (Safari'nin AKSİNE) SOĞUK başlar; ses oturumu proaktif olarak
//  yönetilmezse "resume() başarılı, ama iOS ses donanımını hiç geri
//  vermemiş" durumu oluşabiliyor (bkz. DURUM.md G130/G131 kaydı — bu tam
//  olarak cihazda görülen belirti).
//
//  SIRALAMA (task'ın kendi isteği): önce native oturum etkinleştirilir,
//  SONRA JS'e (sessionActivated olayı) haber verilir — JS bunu ALDIKTAN
//  SONRA kendi resume()+currentTime doğrulamasını yapar (bkz.
//  audio-engine.js:ensureAudioAlive, app.js'in bu olayı dinleyen kısmı).
//

import Foundation
import Capacitor
import AVFoundation

@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSessionPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "activate", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppBecameActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        // #50/#51 — kulaklık çıkarma/takma (ve genel olarak çıkış rotası
        // değişimi — Bluetooth hoparlör de dahil, hepsi AYNI "hoparlörden
        // sessizce devam etme" riskini taşıyor). Bu bildirim ÖNCEDEN HİÇ
        // dinlenmiyordu (ölçüldü) — G132/G134'ün interruptionNotification'ıyla
        // AYNI NotificationCenter deseni.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
        // Uygulama İLK açıldığında (kullanıcı henüz hiç dokunmadan) da bir
        // kez denenir — başarısız olması NORMAL olabilir (henüz kullanıcı
        // etkileşimi yok, sistem izin vermeyebilir); JS kendi unlockAudio
        // akışıyla ZATEN bunu kapsıyor, burası SADECE erken bir ön-ısınma.
        _ = activateSession(reason: "load")
    }

    @discardableResult
    private func activateSession(reason: String) -> Bool {
        let session = AVAudioSession.sharedInstance()
        do {
            // .playback — sessiz anahtar/kilit ekranında bile çalabilsin
            // (bu uygulamanın kulaklık/hoparlör beklentisiyle TUTARLI).
            // .mixWithOthers — başka bir uygulamanın (ör. arka planda
            // çalan müzik) sesini KESMEZ (task'ın kendi "kulaklık/hoparlör
            // davranışı korunacak şekilde" isteği).
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true, options: [])
            print("[audio-diag-native] AVAudioSession etkinleştirildi (\(reason)) — kategori=\(session.category.rawValue)")
            return true
        } catch {
            print("[audio-diag-native] AVAudioSession etkinleştirme HATASI (\(reason)) — \(error.localizedDescription)")
            return false
        }
    }

    // JS'in kendi initAudio()/ensureAudioAlive() akışından DA (özellikle
    // context yeniden oluşturmadan HEMEN ÖNCE) çağrılabilir — "önce native
    // oturum, sonra Web Audio resume" sıralamasını JS tarafında da garanti
    // etmek için.
    @objc func activate(_ call: CAPPluginCall) {
        let ok = activateSession(reason: "js-çağrısı")
        call.resolve(["ok": ok])
    }

    @objc private func handleAppBecameActive() {
        let ok = activateSession(reason: "didBecomeActive")
        notifyListeners("sessionActivated", data: ["ok": ok, "source": "didBecomeActive"])
    }

    // G236 (TUR3B bulgusu 🔴, EN KRİTİK) — ÖNCEDEN bu olay SADECE
    // `notifyListeners()` (Capacitor'ın addListener proxy'si) ile
    // gönderiliyordu — `handleRouteChange`'in AŞAĞIDA aldığı, G135'te
    // kanıtlanmış `evaluateJavaScript` tedavisini HİÇ almamıştı. Kesinti
    // (arama/Siri/alarm) `document.visibilitychange`'i tetiklemiyorsa
    // (BELİRSİZ, cihaza bağlı — bkz. TUR3B-ZAMAN-15-08.md Bölüm D/I) JS
    // tarafı kesintiden HİÇ haberdar olmuyor, round zamanlayıcısı
    // duraklamıyordu. `notifyListeners` çağrıları KALDIRILMADI (zararsız,
    // ileride Capacitor köprüsü çalışır hâle gelirse ekstra bir maliyeti
    // yok) — `evaluateJavaScript` birincil/kanıtlanmış yol olarak EKLENDİ.
    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
        switch type {
        case .began:
            print("[audio-diag-native] AVAudioSession kesintisi BAŞLADI")
            notifyListeners("interruptionBegan", data: [:])
            notifyJsInterruption("began")
        case .ended:
            print("[audio-diag-native] AVAudioSession kesintisi BİTTİ — oturum yeniden etkinleştiriliyor")
            let ok = activateSession(reason: "interruptionEnded")
            notifyListeners("sessionActivated", data: ["ok": ok, "source": "interruptionEnded"])
            notifyJsInterruption("ended")
        @unknown default:
            break
        }
    }

    // handleRouteChange'in AYNI deseni (bkz. o fonksiyonun G135 notu) —
    // window.__aeaNativeInterruption(type) çağırır (audio-engine.js'in
    // window.__aeaNativeRouteChanged'ıyla AYNI mimari).
    private func notifyJsInterruption(_ type: String) {
        DispatchQueue.main.async {
            self.bridge?.webView?.evaluateJavaScript(
                "window.__aeaNativeInterruption && window.__aeaNativeInterruption('\(type)')",
                completionHandler: nil
            )
        }
    }

    // #50/#51 — G135'in notuna göre Capacitor'ın addListener/notifyListeners
    // YÜZEYİ bu app'te (nativePromise tabanlı, düz-script bridge) HİÇ
    // doğrulanmadı — o BELİRSİZLİĞE güvenmek yerine (tahminle düzeltme
    // yapma), WKWebView'e DOĞRUDAN JS enjekte ediyoruz: bu, Capacitor'ın
    // plugin proxy katmanından TAMAMEN bağımsız, standart bir WKWebView
    // API'si — audio-engine.js'in window.__aeaNativeRouteChanged'ı (bkz. o
    // dosyanın G135 notuyla AYNI ilke) çağrılıyor. reasonName SADECE JS'in
    // hangi durumda ne yapacağına karar vermesi için — bu dosyada BİLEREK
    // bir eylem (pause vb.) YOK, "native SADECE bildirir, POLİTİKA JS'te
    // kalır" ilkesi (audio-diag'ın tüm diğer bildirimleriyle AYNI).
    @objc private func handleRouteChange(_ notification: Notification) {
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else { return }
        let reasonName: String
        switch reason {
        case .oldDeviceUnavailable: reasonName = "oldDeviceUnavailable"
        case .newDeviceAvailable: reasonName = "newDeviceAvailable"
        default: reasonName = "other"
        }
        print("[audio-diag-native] route değişti — reason=\(reasonName)")
        DispatchQueue.main.async {
            self.bridge?.webView?.evaluateJavaScript(
                "window.__aeaNativeRouteChanged && window.__aeaNativeRouteChanged('\(reasonName)')",
                completionHandler: nil
            )
        }
    }
}

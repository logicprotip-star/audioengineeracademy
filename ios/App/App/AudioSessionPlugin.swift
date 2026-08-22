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
import UIKit
// G286 — App Store yorum isteme (SKStoreReviewController/AppStore.requestReview).
// StoreKit.framework ZATEN BAĞLI (project.pbxproj — @capgo/native-purchases
// IAP için, bkz. OLCUM-YORUM-17-08.md madde 1) — yeni bir framework linki
// GEREKMEDİ.
import StoreKit
// G339 — ATT (App Tracking Transparency). Aşağıdaki requestTrackingAuthorization
// için; framework ZATEN bağlı (@capacitor-community/admob onu kullanıyor —
// Apple'ın red mesajı da "the app uses the AppTrackingTransparency framework"
// diyerek bunu teyit ediyor), yeni bir framework linki GEREKMEDİ.
import AppTrackingTransparency

@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSessionPlugin"
    // ⚠️ G134'ün tuzağı: bu dizide YOK olan bir metod native tarafta VAR
    // olsa bile JS köprüsünden ÇAĞRILAMAZ (Capacitor'ın plugin keşif
    // sözleşmesi) — YENİ bir @objc metod eklerken buraya AYRICA satır
    // eklenmesi ZORUNLU, unutulması sessiz bir "metot bulunamadı" hatasına
    // yol açar (app.js tarafındaki try/catch bunu yakalar, ama native
    // tarafta HİÇBİR uyarı/derleme hatası VERMEZ — SADECE burası unutulursa).
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "activate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
        // G339 — YUKARIDAKİ ⚠️ uyarısının gereği: bu satır olmadan metot
        // native tarafta VAR olsa bile JS köprüsünden ÇAĞRILAMAZ.
        CAPPluginMethod(name: "requestTrackingAuthorization", returnType: CAPPluginReturnPromise)
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

    // G286 — App Store yorum isteme. JS tarafı (app.js:requestNativeStoreReview,
    // core/review-request.js:shouldRequestReview) NE ZAMAN çağıracağına ÇOKTAN
    // karar verdi (olgunluk/cooldown/ilk-oturum/3-onaylı-an — bu dosyaya HİÇ
    // taşınmadı, DOKUNULMAYACAK) — burası SADECE Apple'ın sistem diyaloğunu
    // TETİKLER, KENDİ UI'ını GÖSTERMEZ (Apple'ın kuralı: özel "Yorum yap"
    // butonu YASAK, SADECE sistem diyaloğu).
    //
    // Diyaloğun GERÇEKTEN gösterilip gösterilmediği bu API'lerin HİÇBİRİNDEN
    // ÖĞRENİLEMEZ (Apple'ın kasıtlı tasarımı — yılda en fazla 3 kez sistem
    // TARAFINDAN sessizce sınırlanır, geliştiriciye bildirim YOK). `call.resolve`
    // SADECE "çağrı native tarafta BAŞARIYLA YAPILDI" anlamına gelir.
    //
    // Üç katmanlı sürüm dalı (task'ın kendi talimatı):
    //   iOS 18+  → AppStore.requestReview(in:) (en yeni, Swift concurrency API)
    //   iOS 16-17 → SKStoreReviewController.requestReview(in:) (AppStore.
    //               requestReview bu aralıkta henüz kullanılabilir kabul
    //               EDİLMEDİ — bkz. OLCUM-YORUM-17-08.md, bu SDK/derleyici
    //               varsayımı Logic'in Xcode derlemesiyle DOĞRULANMALI)
    //   iOS 15 (bu projenin minimum hedefi, project.pbxproj) → AYNI
    //               SKStoreReviewController — "deprecated fallback" (iOS
    //               16'dan sonra Apple'ın eski işaretlediği ama HÂLÂ ÇALIŞAN
    //               tek yol, bu min-deployment'ta BAŞKA seçenek YOK).
    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene
            else {
                // Ön planda aktif bir UIWindowScene yoksa (ör. arka planda
                // çağrılmışsa) sistem diyaloğu ZATEN gösterilemez — sessizce
                // "yapılamadı" döner, HATA FIRLATMAZ (JS tarafı bunu normal
                // bir "false" olarak ele alıyor, çökme YOK).
                call.resolve(["ok": false])
                return
            }
            if #available(iOS 18.0, *) {
                AppStore.requestReview(in: scene)
            } else if #available(iOS 16.0, *) {
                SKStoreReviewController.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve(["ok": true])
        }
    }

    // G339 (Apple Guideline 2.1 reddi — OLCUM-ATT-21-08.md madde E19) —
    // ATT izin isteğinin PROJEYE AİT sürümü.
    //
    // NEDEN KENDİ SÜRÜMÜMÜZ: @capacitor-community/admob'un KENDİ
    // `requestTrackingAuthorization`'ı (AdMobPlugin.swift:62-74) ana thread'e
    // GEÇMİYOR — oysa AYNI dosyadaki `trackingAuthorizationStatus` (satır 188)
    // GEÇİYOR. Capacitor eklenti çağrılarını ARKA PLAN kuyruğunda koşturuyor
    // (CapacitorBridge.swift:131 `DispatchQueue(label: "bridge")`, satır 507
    // `dispatchQueue.async`). UI sunumu gerektiren bir API'nin arka plan
    // thread'inden çağrılması diyaloğun sessizce gösterilmemesinin bilinen bir
    // sebebi. Eklenti node_modules altında (git'te DEĞİL, `npm install` onu
    // ezer) — bu yüzden yama ORAYA DEĞİL, buraya yazıldı.
    //
    // İKİNCİ GARANTİ — applicationState: ATT, uygulama `.active` değilken
    // istenirse iOS diyaloğu SESSİZCE reddeder. Burada TAHMİNİ bir gecikme
    // yerine GERÇEK durum okunuyor; `.active` değilse didBecomeActive
    // bildirimi BEKLENİYOR (load()'daki AYNI NotificationCenter deseni).
    //
    // Eklentinin aksine sonucu JS'e DÖNÜYORUZ (o, completionHandler'ın
    // değerini yutup boş resolve ediyor) — cihazda Xcode konsolundan
    // doğrulama yapılabilsin diye.
    @objc func requestTrackingAuthorization(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if UIApplication.shared.applicationState == .active {
                self.performTrackingRequest(call)
                return
            }
            print("[att-diag-native] uygulama .active DEĞİL — didBecomeActive bekleniyor")
            var observer: NSObjectProtocol?
            observer = NotificationCenter.default.addObserver(
                forName: UIApplication.didBecomeActiveNotification,
                object: nil,
                queue: .main
            ) { _ in
                if let observer = observer { NotificationCenter.default.removeObserver(observer) }
                self.performTrackingRequest(call)
            }
        }
    }

    // SADECE ana thread'den VE uygulama .active iken çağrılmalı.
    private func performTrackingRequest(_ call: CAPPluginCall) {
        ATTrackingManager.requestTrackingAuthorization { status in
            let name: String
            switch status {
            case .authorized: name = "authorized"
            case .denied: name = "denied"
            case .restricted: name = "restricted"
            case .notDetermined: name = "notDetermined"
            @unknown default: name = "unknown"
            }
            print("[att-diag-native] ATT isteği tamamlandı — status=\(name)")
            call.resolve(["ok": true, "status": name])
        }
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

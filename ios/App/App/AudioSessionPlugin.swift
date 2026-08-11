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

    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
        switch type {
        case .began:
            print("[audio-diag-native] AVAudioSession kesintisi BAŞLADI")
            notifyListeners("interruptionBegan", data: [:])
        case .ended:
            print("[audio-diag-native] AVAudioSession kesintisi BİTTİ — oturum yeniden etkinleştiriliyor")
            let ok = activateSession(reason: "interruptionEnded")
            notifyListeners("sessionActivated", data: ["ok": ok, "source": "interruptionEnded"])
        @unknown default:
            break
        }
    }
}

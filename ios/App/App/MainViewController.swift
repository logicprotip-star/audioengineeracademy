//
//  MainViewController.swift
//
//  G134 — CİHAZDA KANITLANDI: AudioSessionPlugin (G132) hiç kayıtlı değildi
//  (Safari konsolu: `Capacitor.PluginHeaders` listesinde YOKTU, temiz
//  derleme + `npx cap sync ios` sonrası bile). Kök sebep: proje SPM
//  kullanıyor VE eklenti bir npm paketi DEĞİL, App target'ının İÇİNDE bir
//  Swift dosyası — Capacitor'ın `PluginHeaders` üretimi SADECE package.json
//  bağımlılığı olan (npm) plugin'ler için CLI tarafından yapılıyor; yerel/
//  ad-hoc bir `CAPBridgedPlugin` sınıfının VARLIĞI (identifier/jsName/
//  pluginMethods TAM olsa BİLE) TEK BAŞINA yeterli değil — Capacitor'ın
//  KENDİ belgelediği yol: `CAPBridgeViewController`'ı alt sınıflayıp
//  `capacitorDidLoad()` içinde `registerPluginInstance()` ile ELLE
//  kaydetmek. Bu sınıf SADECE bunu yapıyor.
//
//  Main.storyboard'daki view controller'ın customClass'ı bu yüzden
//  `CAPBridgeViewController`/`Capacitor` yerine `MainViewController`/`App`
//  olarak GÜNCELLENDİ (bkz. o dosyanın G134 değişikliği).

import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AudioSessionPlugin())
    }
}

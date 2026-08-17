// G279 — OLCUM-CIHAZ2-17-08 madde C düzeltmesi (Logic'in kararı): Reverb'in
// otomatik A/B/C döngü aralığı diğer iki "seamless" üç-yollu moddan
// (Kompresör/Distortion — SEAMLESS_THREE_WAY_MODE_IDS, app.js) FARKLI olmalı.
// Kök sebep (OLCUM-CIHAZ2-17-08'de ölçüldü): Reverb'in Hall tipi 3.2sn'ye
// kadar decay üretiyor (reverb.js DIFFICULTY: decayRange [1.6,3.2]) — SABİT
// 2000ms'lik döngü bu kuyruğu HER ZAMAN kesiyordu ("A→B/B→C geçişleri çok
// hızlı, öğretim değeri kayboluyor" — cihaz raporu). Kompresör/Distortion
// (G267'nin "seamless" crossfade mimarisi) sürekli işlenen bir sinyal —
// "bitmesi gereken bir kuyruk" kavramı YOK, uzatmaya GEREK yok (Logic'in
// KENDİ DOKUNULMAYACAK'ı).
//
// SAF FONKSİYON — audioCtx/DOM bağımsız, `mode` nesnesinin TAMAMINI değil
// SADECE `MODE_ID` string'ini alır (G273'ün resolveOscillatorType'ıyla AYNI
// desen — test edilebilirlik için asgari yüzey).
export const AB_LOOP_INTERVAL_MS_REVERB = 4500;
export const AB_LOOP_INTERVAL_MS_DEFAULT = 2000;

export function resolveAbLoopIntervalMs(modeId) {
  return modeId === "reverb" ? AB_LOOP_INTERVAL_MS_REVERB : AB_LOOP_INTERVAL_MS_DEFAULT;
}

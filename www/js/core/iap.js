// StoreKit / Google Play Billing — G168. @capgo/native-purchases global
// köprüden okunuyor (window.Capacitor.Plugins.NativePurchases) —
// storage.js:getPrefs()/core/ads.js:getAdMobPlugin() İLE AYNI desen,
// bundler/ES-import YOK. Web'de (Capacitor bridge'i yokken) plugin hiç
// yok — getIAPPlugin() null döner, çağıran taraf (app.js) bunu "sadece
// mobil uygulamada çalışır" mesajına çevirir.
//
// Sonuç sözleşmesi upload.js:validateAudioFile / core/ads.js İLE AYNI
// desen: { ok:true } / { ok:false, title, detail } — title/detail
// YOKSA (kullanıcı satın almayı iptal etti) sessizce { ok:false } döner,
// hata TOASTI gösterilmez (bu bir hata değil, beklenen bir sonuç).

// App Store Connect'te tanımlanan ürün — TEK kaynak, koda dağıtılmadı.
// Tek seferlik (Non-Consumable), kalıcı — abonelik DEĞİL.
export const PRODUCT_ID = "com.logicprotrick.audioengineeracademy.pro";

// Native plugin'in kendi "inapp"/"subs" string değeri (PURCHASE_TYPE enum'ı,
// @capgo/native-purchases@8.6.5'in derlenmiş definitions.js'inden DOĞRUDAN
// okunarak doğrulandı — bundler olmadığı için enum'un KENDİSİ import
// edilemiyor, string değeri burada sabit).
const PRODUCT_TYPE_INAPP = "inapp";

export function getIAPPlugin() {
  return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativePurchases) || null;
}

// Saf yardımcı — @capgo/native-purchases'ın KENDİ resmi dokümantasyonundaki
// hata-ayrıştırma deseni (`error.message.includes('User cancelled')`) —
// tahmin edilmedi, plugin'in README'sindeki örnek koddan alındı. Test
// edilebilir (bkz. test/iap.test.mjs), DOM/native bağımlılığı yok.
export function isUserCancelledError(error) {
  const msg = (error && error.message) || "";
  return msg.includes("User cancelled");
}

export function isNetworkError(error) {
  const msg = (error && error.message) || "";
  return msg.includes("Network");
}

// Ana satın alma akışı — grantı UYGULAMAZ (o app.js'te kalır, storage.js'e
// yazma core/ads.js'in grantAdLife()'ı ÇAĞIRMAMASI İLE AYNI mimari sınır),
// SADECE "satın alma başarılı mı" sonucunu döner.
export async function purchasePro() {
  const iap = getIAPPlugin();
  if (!iap) return { ok: false, title: "Satın alma kullanılamıyor", detail: "Satın alma sadece mobil uygulamada yapılabilir." };
  try {
    await iap.purchaseProduct({ productIdentifier: PRODUCT_ID, productType: PRODUCT_TYPE_INAPP });
    return { ok: true };
  } catch (e) {
    if (isUserCancelledError(e)) return { ok: false }; // kullanıcı iptal etti — hata DEĞİL, sessiz
    if (isNetworkError(e)) return { ok: false, title: "Bağlantı hatası", detail: "Bağlantını kontrol edip tekrar dene." };
    return { ok: false, title: "Satın alma başarısız", detail: "Bir şeyler ters gitti, tekrar dene." };
  }
}

// restorePurchases() Promise<void> döner (HANGİ ürünün geri yüklendiğini
// söylemiyor) — bu yüzden ardından getPurchases() ile GERÇEKTEN PRODUCT_ID
// sahipliği var mı diye AYRICA sorgulanıyor (plugin'in kendi dokümante
// ettiği iki adımlı akış).
export async function restorePro() {
  const iap = getIAPPlugin();
  if (!iap) return { ok: false, restored: false, title: "Kullanılamıyor", detail: "Bu özellik sadece mobil uygulamada çalışır." };
  try {
    await iap.restorePurchases();
    const { purchases } = await iap.getPurchases({ productType: PRODUCT_TYPE_INAPP });
    const restored = Array.isArray(purchases) && purchases.some((p) => p.productIdentifier === PRODUCT_ID);
    return { ok: true, restored };
  } catch (e) {
    return { ok: false, restored: false, title: "Geri yükleme başarısız", detail: "Bağlantını kontrol edip tekrar dene." };
  }
}

// Sessiz mülkiyet kontrolü — UI'a HİÇ dokunmaz, hata fırlatmaz, hiçbir
// satın alma/onay ekranı AÇMAZ (getPurchases() yerel/önbellek sorgusu,
// restorePurchases()'ın aksine bir mağaza-senkron işlemi DEĞİL). Uygulama
// açılışında arka planda çağrılır — SADECE `true` dönerse app.js
// storage.js'e proPurchased=true yazar (TEK YÖNLÜ, bkz. storage.js'in
// G168 notu) — `false` dönmesi HİÇBİR ŞEYİ DEĞİŞTİRMEZ.
export async function checkProOwnership() {
  const iap = getIAPPlugin();
  if (!iap) return false;
  try {
    const { purchases } = await iap.getPurchases({ productType: PRODUCT_TYPE_INAPP });
    return Array.isArray(purchases) && purchases.some((p) => p.productIdentifier === PRODUCT_ID);
  } catch (e) {
    return false;
  }
}

// Mağazadan GERÇEK, lokalize fiyat metni (`priceString` — "₺399,99" gibi,
// para birimi işaretiyle) — paywall.js:PRO_PRICE sabiti sadece plugin
// yokken/ürün yüklenemezken YEDEK olarak kalır, koda sabit yazılmaz
// (App Store kuralı: "You MUST display product names and prices using
// data from the plugin... Hardcoded values will cause App Store rejection").
export async function fetchProPrice() {
  const iap = getIAPPlugin();
  if (!iap) return null;
  try {
    const { products } = await iap.getProducts({ productIdentifiers: [PRODUCT_ID], productType: PRODUCT_TYPE_INAPP });
    const product = Array.isArray(products) ? products.find((p) => p.identifier === PRODUCT_ID) : null;
    return (product && product.priceString) || null;
  } catch (e) {
    return null;
  }
}

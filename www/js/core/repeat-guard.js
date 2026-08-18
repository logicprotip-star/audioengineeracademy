// G292 (OLCUM-UC-18-08.md madde C) — dar soru-uzaylı modlarda (ör. üç şıklı
// Kompresör/Reverb/Saturation'ın oddIndex'i, K=3) aynı kimliğin ARKA ARKAYA
// gelme hissini azaltır (Logic'in cihazda yaşadığı şikayet: "%33 ihtimalle
// aynı soru arka arkaya"). "Retry-until-valid" (rastgele çek, geçmişteyse
// TEKRAR çek) YERİNE "kalan küme" yaklaşımı — hiçbir retry/loop YOK, bu
// yüzden N>=K (ya da K çok küçük) olsa bile SONSUZ DÖNGÜ YAPISAL OLARAK
// İMKÂNSIZ (ölçüm raporunun 2. önerisi, TEK aday havuzu boş DÖNEMEZ:
// `candidates.length>=1` olduğu sürece fonksiyon her zaman bir değer verir).
//
// SAF FONKSİYON — audioCtx/DOM bağımsız, mutable state TUTMAZ (geçmiş
// `recentValues` PARAMETRE olarak geçirilir, mod sözleşmesinin `createQuestion`
// SAF kalmalı kısıtına uyumlu).
//
// ⚠️ K=2 (ikili) eksenli modlarda (Boost mu Cut mu'nun `direction`'ı, dB
// Seviyesi'nin yön ekseni, Frekans Çakışması Aşama 2'nin `correctSource`'u)
// BU FONKSİYON KASITLI OLARAK ÇAĞRILMIYOR — ölçüm raporunun uyarısı: K=2'de
// sert "az önceki tekrar etme" kuralı geriye TEK bir zorunlu değer bırakır,
// kullanıcı sesi hiç dinlemeden "öncekinin tersi" diyerek %100 doğru
// cevaplayabilir hale gelir (mod anlamsızlaşır) — bkz. DURUM.md G292 notu.
export function pickAvoidingRecent(candidates, recentValues, rng = Math.random) {
  const recentSet = new Set(recentValues);
  let allowed = candidates.filter((c) => !recentSet.has(c));
  // Son N kimliğin TAMAMI aday havuzunu kapladıysa (N>=K ya da K küçük) —
  // geriye TEK adım geriye çekilip SADECE en son kimliği hariç tutuyoruz,
  // K>=2 olduğu sürece bu her zaman en az bir aday bırakır.
  if (allowed.length === 0 && recentValues.length > 0) {
    const last = recentValues[recentValues.length - 1];
    allowed = candidates.filter((c) => c !== last);
  }
  // K=1 (12 modun hiçbirinde yok, ölçüldü) gibi bir uç durumda bile BOŞ
  // dönmesin diye son çare tüm adaylara düşer — retry YOK, sonsuz döngü YOK.
  if (allowed.length === 0) allowed = candidates;
  return allowed[Math.floor(rng() * allowed.length)];
}

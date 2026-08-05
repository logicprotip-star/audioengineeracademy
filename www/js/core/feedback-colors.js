// Cevap sonrası iki renkli görsellerin (Kesim Noktası eğrisi, dB göstergesi,
// Boost/Cut bell, Q genişlik, Kompresör dinamik zarf) PAYLAŞILAN renk çifti —
// standart doğru/yanlış mantığı: senin cevabın KIRMIZI, doğru cevap YEŞİL.
// Önceden her mod dosyası bu ikiliyi KENDİ içinde tekrarlıyordu (kopyala-
// yapıştır, styles.css'teki --am/--gr/--rd'ye "bkz." yorumuyla) — beş dosyada
// AYRI AYRI değişmesi gereken bir renk değişikliği (amber→kırmızı) bunun
// gerçek bir tekrar ağrısı olduğunu kanıtladı, o yüzden buraya taşındı. Yeni
// bir Motor 2 modu (reverb/distortion) eklerken de BURADAN import edilmeli.
export const GUESS_COLOR = "#FF4D6D"; // --rd — styles.css'in .ans.wrong'da da kullandığı standart "yanlış/senin cevabın" kırmızısı
export const CORRECT_COLOR = "#2BD9A8"; // --gr — styles.css'in standart "doğru" yeşili

# LückenSprint — iki dağıtım seçeneği

LückenSprint, FAU Almanca C-Test hazırlığı için Türkçe arayüzlü bir uygulamadır. 125 özgün A1–C1 Almanca metin, pratik/deneme modları, hata analizi, yerel ilerleme ve JSON/CSV dışa aktarma içerir. Sunucu, ücretli API veya hesap gerekmez.

## A. Önerilen iPhone yöntemi: barındırılan PWA

Uygulamayı ücretsiz olarak GitHub Pages veya Cloudflare Pages üzerinde yayınlayın. iPhone’da Safari ile siteyi açın, **Paylaş** → **Ana Ekrana Ekle** seçin. İlk başarılı açılıştan sonra uygulama, metin veritabanları ve tüm gerekli varlıklar çevrimdışı önbelleğe alınır; bilgisayarınız kapalıyken de çalışır.

İlerleme her cihazın kendi tarayıcısında saklanır. Cihaz değiştirirken **Ayarlar** sayfasından JSON yedeği dışa aktarıp diğer cihazda içe aktarın. Açık tam denemeler yerel olarak kaydedilir ve uygulama yeniden açıldığında geri yüklenir. Yeni PWA sürümü hazır olduğunda uygulama bir güncelleme bildirimi gösterir.

### GitHub Pages ile ücretsiz yayınlama

Bu klasörde hazır bir GitHub Actions iş akışı vardır: [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

1. GitHub’da yeni, boş bir depo oluşturun; örneğin `lueckensprint`.
2. Bu klasörde terminal açın ve sırasıyla çalıştırın:

   ```powershell
   git init
   git add .
   git commit -m "Deploy LueckenSprint PWA"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/lueckensprint.git
   git push -u origin main
   ```

3. GitHub deposunda **Settings** → **Pages** bölümüne gidin. **Build and deployment** kaynağı olarak **GitHub Actions** seçin.
4. Actions sekmesindeki “Deploy LückenSprint to GitHub Pages” çalışmasının bitmesini bekleyin.

Yayın URL biçimi: `https://KULLANICI_ADINIZ.github.io/lueckensprint/`.

Tüm uygulama yolları göreli (`./`) olduğu için depo alt yolunda çalışır. Her `main` dalı gönderimi veritabanlarını yeniden üretir ve ücretsiz Pages yayını yapar.

### Cloudflare Pages ile ücretsiz yayınlama

1. Projeyi GitHub’a gönderin.
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** seçin.
3. Depoyu seçin. Build command alanına `node generate-text-data.js` yazın; output directory olarak `.` yazın.
4. Ücretsiz plandaki projeyi yayınlayın.

Netlify veya Vercel’de de build komutu `node generate-text-data.js`, yayın klasörü `.` olarak ayarlanabilir.

## B. Standalone iPhone yöntemi

Tek dosyalı sürümü oluşturun:

```powershell
npm run build:standalone
```

Bu işlem [dist/LueckenSprint_Standalone.html](dist/LueckenSprint_Standalone.html) dosyasını üretir. Dosyayı AirDrop, iCloud Drive veya başka bir dosya aktarım yöntemi ile iPhone’a gönderin ve Files uygulamasından açmayı deneyin.

iOS, yerel HTML çalıştırmayı sınırlayabilir ve yerel depolamayı temizleyebilir. Bu nedenle standalone sürümde görünen **Yedek oluştur** düğmesini düzenli kullanın. Tam deneme bitince JSON yedeği otomatik indirilmeye çalışılır. JSON ilerleme, CSV hata listesi ve CSV tam deneme dışa aktarmaları Ayarlar sayfasındadır.

Standalone dosya hiçbir CDN, font, resim, fetch isteği, modül, web sunucusu veya service worker’a bağlı değildir. İçe gömülü CSS, JavaScript ve beş JSON metin veritabanı ile çalışır.

## C. Masaüstünde standalone yöntemi

`npm run build:standalone` komutundan sonra `dist/LueckenSprint_Standalone.html` dosyasına çift tıklayın ve Chrome veya Edge ile açın. İnternet bağlantısı gerekmez.

## Geliştirme ve test

Barındırılan PWA sürümünü geliştirme sırasında VS Code Live Server ile `index.html` dosyasını açarak çalıştırabilirsiniz. Service worker/PWA davranışı için dosyayı doğrudan çift tıklamak yerine yerel sunucu kullanın.

```powershell
npm test
npm run build:data
npm run build:standalone
```

`npm test`, C-Test boşluk oluşturma, çift/tek harf bölme, umlaut/ß puanlama ve 125 metin sayısını denetler. Standalone oluşturucu gerekli CSS, JavaScript ve JSON dosyalarını kontrol eder; eksik dosyada anlaşılır bir hatayla durur, güvenli şekilde tek dosyaya gömer ve çıktı yolunu/boyutunu yazar.

## Proje yapısı

```text
index.html                 Hosted PWA giriş noktası
styles.css                 Arayüz stilleri
app.js                     Uygulama mantığı ve gömülü çalışma verisi
data/texts-a1.json … c1    125 kaynak metin veritabanı
manifest.json              PWA bildirimi
service-worker.js          Çevrimdışı önbellek ve sürüm güncellemesi
build-standalone.js        Tek HTML üreticisi
dist/                      Oluşturulan standalone dosya
```

Uygulama yüzdeleri yalnızca eğitim geri bildirimidir; FAU’nun resmî yerleştirme sonucu veya eşikleri değildir.

## Supabase ile isteğe bağlı cihazlar arası senkronizasyon

Uygulama yapılandırılmadığında tamamen yerel misafir modunda çalışır; JSON/CSV yedekleri değişmeden kalır. Aynı e-posta ile PC ve iPhone arasında otomatik ilerleme senkronizasyonu için:

1. Supabase’de ücretsiz bir proje oluşturun ve **Authentication → Providers → Email** altında Magic Link/OTP e-postasını etkinleştirin.
2. **Authentication → URL Configuration** bölümüne şu redirect URL’yi ekleyin: `https://alpbuyukatak.github.io/lueckensprint/`.
3. Supabase SQL Editor’da [supabase/migrations/001_user_progress.sql](supabase/migrations/001_user_progress.sql) dosyasının tamamını çalıştırın. Bu dosya tabloyu, indeksini, RLS’yi ve yalnızca `auth.uid() = user_id` erişim politikalarını oluşturur.
4. [supabase-config.js](supabase-config.js) içindeki boş `url` ve `publishableKey` değerlerini Project URL’niz ve **`sb_publishable_…`** anahtarınızla doldurun. Secret veya service-role anahtarını asla tarayıcıya koymayın.
5. Bu iki değerle çalıştıktan sonra dosyayı kendi yayın akışınızda güncelleyin. Anon anahtarı frontend için kamuya açıktır; güvenlik RLS politikalarıyla sağlanır.

Ayarlarda e-posta magic-link girişi, geçerli kullanıcı, senkronizasyon durumu, manuel indirme/yükleme ve bulut yedeği kontrolleri görünür. Senkronizasyon; kayıtları kimliğe göre birleştirir, ayarlarda yeni zaman damgasını seçer, özel metin silmelerini tombstone ile korur ve en yeni açık denemeyi kullanır. Çevrimdışı değişiklikler yerelde kalır ve bağlantı döndüğünde debounced olarak yeniden denenir.

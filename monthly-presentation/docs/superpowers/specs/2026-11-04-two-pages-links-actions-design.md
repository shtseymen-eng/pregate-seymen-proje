# GitHub Actions'ta İki Yayın Bağlantısı Tasarımı

## Amaç

GitHub Actions çalıştırma grafiğinde ana Pregate sitesi ile aylık sunum hazırlama aracını iki ayrı, tıklanabilir bağlantı olarak göstermek. Kullanıcı Actions ekranına girdiğinde `Ana Pregate Sistemi` ve `Pregate Sunum Hazırlama` bağlantılarını aynı başarılı yayın akışında görebilecek.

## Hedefler

- GitHub'ın düzenlenemeyen otomatik Pages akışı yerine depoda yönetilen özel bir Pages workflow'u kullanmak.
- Ana siteyi mevcut kök adreste yayımlamayı sürdürmek.
- `Pregate Sunum Hazırlama` adlı ikinci bir iş kutusunda aylık sunum aracının doğrudan bağlantısını göstermek.
- İkinci bağlantıyı yalnızca Pages yayını başarıyla tamamlandıktan sonra etkinleştirmek ve adresin erişilebilir olduğunu denetlemek.

## Kapsam Dışı

- İkinci bir GitHub Pages sitesi veya yeni depo oluşturmak.
- Pregate sunum üretme ekranını, Excel okuma kurallarını ya da PowerPoint içeriğini değiştirmek.
- Mevcut ana site adresini değiştirmek.

## Seçilen Yaklaşım

`.github/workflows/pages.yml` içinde özel bir GitHub Pages akışı oluşturulacak:

1. `build` işi depoyu alacak, Pages ayarını hazırlayacak ve depo kökünü yayın paketi olarak yükleyecek.
2. `deploy` işi paketi `github-pages` ortamına yayımlayacak ve ana site bağlantısını gösterecek.
3. `pregate-presentation` işi `deploy` tamamlandıktan sonra çalışacak, `Pregate Sunum Hazırlama` ortamına bağlanacak ve `https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/` adresini grafikte gösterecek.
4. Son iş, bağlantıya kısa bir erişim kontrolü uygulayacak; böylece kutunun yeşil olması yalnızca bağlantının gerçekten açılmasıyla mümkün olacak.

GitHub Pages yayın kaynağı depo ayarlarında `GitHub Actions` olarak değiştirilecek. Workflow hem `main` dalına gönderimde hem de elle çalıştırmada kullanılabilecek. Aynı anda birden fazla Pages yayınının çakışmasını önlemek için Pages concurrency grubu kullanılacak.

## Değerlendirilen Alternatifler

- **Seçilen: Özel Pages workflow'u ve iki environment işi.** İki bağlantıyı doğrudan çalışma grafiğinde gösterir ve kullanıcının istediği görünümü verir.
- **Otomatik Pages akışını koruyup bağlantıları özet bölümüne yazmak.** Daha az değişikliktir; ancak ikinci bağlantı ayrı kutu olarak görünmez.
- **Sunum aracını ayrı depo veya ayrı site olarak yayımlamak.** Gereksiz bakım ve adres karmaşası oluşturur; tek site altında çalışan mevcut yapıya uygun değildir.

## Doğrulama

- Önce workflow yapısını ve iki bağlantıyı bekleyen otomatik test yazılacak ve mevcut durumda başarısız olduğu görülecek.
- Workflow eklendikten sonra tüm web testleri çalıştırılacak.
- GitHub Actions yayını başarıyla tamamlanacak.
- Çalıştırma grafiğinde ana yayın ve `Pregate Sunum Hazırlama` bağlantıları ayrı kutularda kontrol edilecek.
- İki canlı adres de açılarak doğrulanacak.

## Başarı Ölçütü

En son Pages workflow çalıştırmasında iki tıklanabilir bağlantı görünür; ana site ve aylık sunum hazırlama aracı doğru adreslerde açılır ve mevcut sunum üretme işlevi değişmeden çalışır.

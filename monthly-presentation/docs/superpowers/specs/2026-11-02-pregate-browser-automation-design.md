# Pregate Tarayıcı Sunum Otomasyonu Tasarımı

## Amaç ve neden

Kullanıcı her ay iki Excel dosyasını tek bir web sayfasında seçerek o aya ait Pregate PowerPoint sunumunu oluşturabilmelidir. Ana Pregate çalışma kitabı bütün sunum verilerinin kaynağı olacak; Araç Kayıt Sorgulama çalışma kitabı yalnızca Alışan kayıtlarını Ravago ve diğer Alışan olarak ayırmak için kullanılacaktır. Sayfa GitHub Pages üzerinden açılacak ve Excel içerikleri kullanıcının tarayıcısından dışarı gönderilmeyecektir.

## Hedefler

- İki `.xlsx` dosyasını açık rollerle yükletmek: `Pregate sunum verisi` ve `Araç kayıt sorgusu`.
- Rapor dönemini dosyaların içinden otomatik belirlemek ve iki kaynağın dönemini doğrulamak.
- Mevcut 13 slaytlık kurumsal sunumun veri kapsamını, toplamlarını, Alışan–Ravago ayrımını, veri notlarını ve dosya adlandırmasını korumak.
- Üretim bittikten sonra `AY YIL PREGATE SUNUM.pptx` dosyasını tarayıcıdan indirmek.
- Kullanıcıya yükleme, doğrulama, hazırlanma ve indirme aşamalarını sade Türkçe durum mesajlarıyla göstermek.
- Mevcut GitHub Pages sitesi içinde doğrudan açılabilen kalıcı bir bağlantı sağlamak.

## Hedef olmayanlar

- Excel dosyalarını veya üretilen sunumları sunucuda saklamak.
- Kullanıcı hesabı, giriş ekranı, veritabanı veya geçmiş sunum arşivi oluşturmak.
- Kullanıcının kaynak Excel dosyalarını değiştirmek.
- Mevcut terminal operasyon uygulamasının diğer modüllerini yeniden tasarlamak.
- PowerPoint masaüstü uygulamasında makro çalıştırmak.

## Başarısızlık sayılacak durumlar

- Ana Pregate verileri yerine Araç Kayıt Sorgulama dosyasından başka analizlerin alınması.
- Alışan dışındaki taşıyıcılara ait Ravago kayıtlarının Ravago toplamına eklenmesi.
- Kaynak dosyaların bir sunucuya veya üçüncü taraf depolamaya yüklenmesi.
- Ay/yıl uyuşmazlığına rağmen sunum oluşturulması.
- Toplamların sessizce birleştirilmesi veya farklı kapsamların kullanıcıdan gizlenmesi.
- Telefon, sürücü kimliği, plaka gibi satır düzeyi hassas alanların sunuma eklenmesi.

## Kısıtlar

- GitHub Pages statiktir; Python, Node.js veya sunucu tarafı işlem çalıştıramaz.
- Mevcut masaüstü üretici Python, Node ve Codex sunum çalışma zamanına bağlıdır; bu nedenle tarayıcı sürümü, doğrulanmış iş kurallarını JavaScript'e taşıyacaktır.
- Tarayıcı sürümünde 13 slayt yeniden oluşturulacaktır. Eşdeğerlik aynı veri, toplam, başlık, düzenlenebilir tablo/grafik ve kurumsal görünüm anlamına gelir; piksel düzeyinde şablon özdeşliği vaat edilmez.
- Büyük dosyalarda tüm işlem tarayıcı belleğinde yapılır. Arayüz üretim sırasında ilerleme göstermeli ve çift tıklamayı engellemelidir.
- Kurumsal görseller ve gerekli JavaScript bağımlılıkları proje içinde sürümlenmiş olmalı; çalışma anında harici CDN zorunluluğu bulunmamalıdır.
- Tarayıcı XLSX formüllerini yeniden hesaplamaz; çalışma kitabında kaydedilmiş sonuç değerlerini kullanır. Gerekli bir formül hücresinin kaydedilmiş sonucu yoksa işlem anlaşılır bir hatayla durur.

## Değerlendirilen yaklaşımlar

### 1. GitHub Pages içinde tarayıcıda üretim — seçilen

Excel dosyaları File API ile okunur, çalışma sayfaları tarayıcı uyumlu XLSX kütüphanesiyle ayrıştırılır ve PowerPoint tarayıcı uyumlu bir sunum kütüphanesiyle oluşturulur. Dosya içerikleri yalnızca yerel bellekte kalır.

Avantajları: kalıcı GitHub bağlantısı, sunucu/hesap/aylık ücret gerektirmemesi, veri gizliliği ve kullanıcının istediği basit yükle–indir akışı. Bedeli: mevcut Python çıkarım ve sunum kodundaki iş kurallarının tarayıcı JavaScript'ine dikkatle taşınmasıdır.

### 2. Sunuculu web uygulaması

Mevcut üretici bir Python/Node sunucusunda çalıştırılır. Kodun daha fazla kısmı yeniden kullanılabilir; ancak barındırma hesabı, çalışma zamanı yönetimi ve dosyaların sunucuya yüklenmesi gerekir. Kullanıcının GitHub bağlantısı ve yerel veri işleme tercihine uymadığı için seçilmedi.

### 3. GitHub Actions üzerinden manuel üretim

Üretim bir iş akışında çalıştırılabilir; fakat GitHub Actions formu doğrudan iki dosya yükleme deneyimi sağlamaz. Dosyaları repoya ekleme veya ek bir depolama adımı gerektirdiği için aylık kullanım açısından gereksiz karmaşıktır ve seçilmedi.

## Kullanıcı deneyimi

Doğrudan bağlantıda tek görevli bir sayfa açılır:

1. `Pregate Sunum Excel'i` alanında ana rapor seçilir.
2. `Araç Kayıt Sorgulama Excel'i` alanında araç raporu seçilir.
3. Sayfa dosya adlarını ve türlerini gösterir; iki dosya hazır olduğunda `Sunumu Oluştur` düğmesi etkinleşir.
4. Düğmeye basıldığında sırasıyla `Dosyalar okunuyor`, `Veriler doğrulanıyor`, `Sunum hazırlanıyor` ve `İndirme hazır` durumları görünür.
5. Başarılı sonuçta ay ve yıl ile toplam araç, Ravago ve diğer Alışan sayıları kısa bir özet olarak gösterilir; sunum otomatik indirilir ve ayrıca `Tekrar İndir` düğmesi sunulur.
6. Hata halinde teknik ayrıntı yerine hangi dosyanın veya alanın sorunlu olduğu ve kullanıcının ne yapması gerektiği Türkçe açıklanır.

Sayfa Poliport/Pregate sunumunun mavi-beyaz kurumsal çizgisini kullanır, mobilde de dosya seçimi yapılabilir; asıl kullanım masaüstü tarayıcıdır.

## Veri akışı

```text
PregateSunum_Tam.xlsx ─┐
                       ├─> Tarayıcı belleğinde doğrulama ve model ─> 13 slaytlık PPTX ─> Yerel indirme
Arac_Kayit_Sorgulama.xlsx ┘
```

Hiçbir Excel satırı ağ isteğine, LocalStorage'a veya analitik servisine yazılmaz. Sayfa yenilenince seçili dosyalar ve üretilen nesne belleği kaybolur.

Üretim paketinde CDN, telemetri, dosya içeriğini kullanan `fetch` çağrısı veya kullanıcı verisi içeren kaynak haritası bulunmaz. Gerçek aylık Excel dosyaları test sırasında yalnızca yerel dosya yolundan okunur; repoya, derlenmiş pakete veya Git geçmişine eklenmez.

## İş kuralları

- Ana dosyada gerekli çalışma sayfaları ve beklenen başlıklar bulunmalıdır.
- Rapor dönemi ana dosyanın başlık hücrelerinden okunur.
- Araç kayıt dosyasının dönem aralığı okunur ve ana dosyanın ay/yılıyla eşleşmelidir.
- Ay kolonları sabit Ekim aralığıyla değil, Ocak–Aralık başlıkları dinamik taranarak bulunur; yalnızca rapor ayına kadarki değerler kümülatif toplama katılır.
- Ravago sayısı yalnızca taşıyıcısı Alışan olan satırlar içinde firma adı Ravago olan kayıtlardır.
- Diğer Alışan sayısı, aynı Alışan taşıyıcı kümesinde Ravago olmayan kayıtlardır.
- Aylık ve yıllık tabloların kapsam farkları birleştirilmez; son slaytta veri notu olarak gösterilir.
- Yoğun boş araç nedenleri `Other reasons`, yoğun ret firmaları `OTHER LOGISTICS COMPANIES` altında mevcut masaüstü sürümündeki eşiklerle gruplanır ve sayısal toplamlar korunur.
- Dosya adı Türkçe büyük harf ay adıyla üretilir: `EKİM 2026 PREGATE SUNUM.pptx`.

## Teknik yapı

- `monthly-presentation/web/`: web uygulamasının kaynak kodu ve testleri.
- `monthly-presentation/web/src/extract.js`: Excel şeması, dönem ve sayısal veri çıkarımı.
- `monthly-presentation/web/src/model.js`: sunum modeli, kapsam uyarıları ve gruplama kuralları.
- `monthly-presentation/web/src/deck.js`: 13 slaytın düzenlenebilir tablo ve grafiklerle oluşturulması.
- `monthly-presentation/web/src/app.js`: dosya seçimi, durum yönetimi, hata mesajları ve indirme.
- `monthly-presentation/web/index.html` ve `assets/`: GitHub Pages'in doğrudan servis edeceği derlenmiş sayfa.
- Mevcut kök uygulamadaki Pregate menüsüne `Aylık Sunum Oluştur` bağlantısı eklenir; doğrudan URL de bağımsız çalışır.

Tarayıcı paketi yerel bağımlılıklarla derlenir. Üretim ortamı harici CDN'e güvenmez. Kaynak dosya içerikleri üzerinde ağ çağrısı yapan kod bulunmaz.

## Hata yönetimi

- Yanlış uzantı veya okunamayan dosya: ilgili alan kırmızı durum ve yeniden seçme yönlendirmesi gösterir.
- Eksik sayfa/başlık: çalışma sayfası veya beklenen kolon adı belirtilir.
- Dönem uyuşmazlığı: iki kaynakta okunan ay/yıl birlikte gösterilir ve üretim durdurulur.
- Sunum üretim hatası: kullanıcı dosyaları yeniden seçmeden tekrar deneyebilir; teknik ayrıntı tarayıcı konsoluna, sade mesaj ekrana yazılır.
- İndirme engellenirse `Tekrar İndir` düğmesi aktif kalır.

## Test ve doğrulama

- Mevcut Ekim kaynak dosyalarıyla tarayıcı çıkarım sonuçları masaüstü Python modelinin temel toplamlarıyla karşılaştırılır.
- Alışan–Ravago sınıflandırması için yanlış taşıyıcıya ait Ravago, dönem uyuşmazlığı ve eksik kolon testleri bulunur.
- Kaynak kitaplarda sonraki ay kolonu olsa bile yıllık vardiya toplamlarının yalnızca rapor ayına kadar hesaplandığı test edilir.
- Yoğun tablo gruplamalarında bütün sayısal kolonların toplamı korunur.
- Üretilen `.pptx` ZIP/OOXML paketi, 13 slayt, tablo/grafik varlığı ve hassas alanların yokluğu açısından otomatik kontrol edilir.
- Derlenmiş JavaScript paketi CDN, telemetri, dosya içeriğini ağ üzerinden ileten kod ve kaynak haritası açısından taranır.
- Gerçek Excel dosyalarının Git durumunda veya geçmişe eklenecek dosyalar arasında bulunmadığı yayın öncesi doğrulanır.
- Chromium tabanlı bir tarayıcıda gerçek iki dosya yüklenerek indirme akışı ve görsel durumlar elle doğrulanır.
- Yayınlanan GitHub Pages URL'si terminal durumuna ulaşana kadar kontrol edilir.

## Yayınlama ve bağlantı

Uygulama mevcut `shtseymen-eng/pregate-seymen-proje` deposunun GitHub Pages yayınına eklenir. Hedef doğrudan bağlantı:

`https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/`

Yayınlama, mevcut `fix/aylik-sunum` dalındaki değişiklikleri koruyarak ayrı ve açıklanmış commitler oluşturmayı; testleri geçen web dosyalarını kontrollü biçimde `main` dalına birleştirmeyi/göndermeyi; ardından mevcut `main`/kök Pages kaynağının hedef yolu servis ettiğini doğrulamayı kapsar. Gerçek Excel dosyaları hiçbir commit'e dahil edilmez.

## Uygulayıcıya kalan kararlar

- Tarayıcı XLSX ve PPTX kütüphanelerinin güncel, lisansı uygun ve paketlenebilir sürümlerini seçmek.
- Mevcut şablondaki logo/kapak görsellerini web paketi için uygun boyutta çıkarmak.
- Erişilebilir durum duyuruları ve küçük ekran kırılımlarını nihai CSS içinde ayarlamak.
- GitHub Pages'in mevcut yayın dalı/yolu doğrulandıktan sonra en az riskli yayın adımını seçmek.

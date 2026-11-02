# SEYMEN Terminal Operasyon Yönetim Sistemi

Tek GitHub Pages uygulaması içinde üç ana bölüm:

1. Nakliyeci Portalı
2. Pregate Operasyonları
3. Ürün & ADR Yönetimi

## Yayınlama
Repo kökünde `index.html` bulunmalıdır. GitHub Pages: `main` / `/(root)`.

## Pregate aylık sunum oluşturucu

Ana ekrandaki **Aylık Pregate Sunumu Oluştur** bağlantısı veya Pregate menüsündeki **Aylık Sunum Oluştur** seçeneği, iki Excel dosyasından 13 slaytlık PowerPoint hazırlar.

- Ana Pregate Excel dosyası tüm analizlerin kaynağıdır.
- Araç Kayıt Sorgulama Excel dosyası yalnızca Alışan kayıtlarını Ravago ve diğer Alışan olarak ayırır.
- Dosyalar yalnızca kullanıcının tarayıcısında işlenir ve sunucuya gönderilmez.

Yayın adresi: [Pregate aylık sunum oluşturucu](https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/)

## Veri
Demo verileri tarayıcı LocalStorage içinde saklanır. Üretim sürümünde backend, veritabanı, kullanıcı yetkilendirme, gerçek SMS, dosya depolama ve ERP/TOS entegrasyonları ayrıca uygulanmalıdır.

## Ürün & ADR Yönetimi Kaynağı
`modules/urun-adr/` klasörü, mevcut SEYMEN Lojistik uygulamasının ürün listesi, ürün alım, araç gereklilikleri, araç işaretleme, ADR etiketleri ve tank kodu verilerini içerir. ADR SVG varlıkları tekil dosya adlarıyla tutulur; lisans bilgisi `THIRD_PARTY_NOTICES.md` içindedir.

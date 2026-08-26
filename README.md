# SEYMEN Terminal Operasyon Yönetim Sistemi

Tek GitHub Pages uygulaması içinde üç ana bölüm:

1. Nakliyeci Portalı
2. Pregate Operasyonları
3. Ürün & ADR Yönetimi

## Yayınlama
Repo kökünde `index.html` bulunmalıdır. GitHub Pages: `main` / `/(root)`.

## Veri
Demo verileri tarayıcı LocalStorage içinde saklanır. Üretim sürümünde backend, veritabanı, kullanıcı yetkilendirme, gerçek SMS, dosya depolama ve ERP/TOS entegrasyonları ayrıca uygulanmalıdır.

## Ürün & ADR Yönetimi Kaynağı
`modules/urun-adr/` klasörü, mevcut SEYMEN Lojistik uygulamasının ürün listesi, ürün alım, araç gereklilikleri, araç işaretleme, ADR etiketleri ve tank kodu verilerini içerir. ADR SVG varlıkları tekil dosya adlarıyla tutulur; lisans bilgisi `THIRD_PARTY_NOTICES.md` içindedir.

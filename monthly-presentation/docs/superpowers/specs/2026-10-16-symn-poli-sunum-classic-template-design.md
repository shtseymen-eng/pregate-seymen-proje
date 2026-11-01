# SYMN Poli Sunum Klasik Şablon Tasarımı

## Amaç

Eylül 2026 örnek sunumunu, kullanıcının gönderdiği önceki ay PowerPoint dosyasındaki kurumsal düzen ve veri sunum biçimine sadık kalarak yeniden üretmek. Aynı sistem sonraki aylarda yalnızca aylık Excel raporları verilerek tekrar çalıştırılabilmelidir.

## Referans ve veri kaynakları

- Görsel ve yapısal referans: `/Users/seymen/Downloads/EYLÜL 2026 PREGATE SUNUM.pptx`
- Ana veri kaynağı: `/Users/seymen/Downloads/PregateSunum_Tam.xlsx`
- Ravago–Alişan ayrımı: `/Users/seymen/Downloads/Arac_Kayit_Sorgulama (3).xlsx`

## Tasarım ilkeleri

- Poliport ve Polisan logoları, üstbilgi, altbilgi, slayt numarası, mavi tablo başlıkları ve gri/beyaz satır düzeni referans sunumdaki gibi korunur.
- Tesis, araç, çalışan veya saha fotoğrafları kullanılmaz. Referans kapağın kurumsal mavi grafiği ve kurumsal logolar fotoğraf sayılmaz ve korunabilir.
- Sunum 16:9 oranında ve tamamen düzenlenebilir PowerPoint nesneleriyle hazırlanır.
- Başlıklarda ve tablo metinlerinde referanstaki Calibri ağırlıklı tipografi korunur. Okunabilirlik için düzensiz büyük/küçük harf kullanımı düzeltilir.
- Tablolar ve grafikler referans sunumdaki sade, kurumsal görünümü takip eder. Modern kartlar, fotoğraf kapakları ve yeni dashboard düzeni kullanılmaz.

## Dil kuralları

- Slayt başlıkları, tablo sütunları, grafik açıklamaları, lejantlar ve kapsam notları İngilizce yazılır.
- Departman adları kaynak dosyadaki özgün biçimiyle kalır ve çevrilmez.
- Firma ve nakliyeci adları özel ad olduğu için kaynak biçimiyle korunur.
- Dosya adı Türkçe ay adıyla `<AY> <YIL> PREGATE SUNUM.pptx` biçiminde üretilir. Eylül örneği: `EYLÜL 2026 PREGATE SUNUM.pptx`.

## Kesin kapsam dışı öğeler

- Blacklist verileri ve Blacklist slaytı
- Kantar/weighbridge verileri ve Kantar slaytları
- Saha/araç/çalışan fotoğrafları
- Eski “Back Up” bölümü
- Plaka, sürücü, telefon veya başka kişisel bilgiler

## Onaylanan slayt yapısı

1. **Cover** — referanstaki mavi kurumsal kapak yapısı; `PREGATE SEPTEMBER 2026` başlığı; fotoğraf yok.
2. **2026 – September Vehicle Numbers** — departman, approved, rejected ve total tablosu.
3. **Pregate Site Service Percentage Distribution** — departman dağılımını gösteren düzenlenebilir pasta grafik.
4. **Poliport 2026 Vehicle List by Shift** — Ocak–Eylül aylık vardiya tablosu ve yıllık toplam.
5. **Inspected Vehicles 2025–2026** — departman bazında önceki ve güncel dönem karşılaştırma tablosu.
6. **2025–2026 Total Number of Rejections per Year** — retlerin departman bazında dönem karşılaştırma tablosu.
7. **Poliport Terminal September Empty Trucks** — boş araç nedenleri tablosu ve sorumlu birim özeti.
8. **Poliport Terminal – Empty Vehicles by Company** — boş araçların firma bazında tablosu.
9. **Pregate September Logistics Companies / +30 Vehicles** — düzenlenebilir yatay grafik; Ravago ve Alişan ayrı gösterilir.
10. **2026 – September Rejection Distribution by Departments** — düzenlenebilir departman ret dağılımı grafiği.
11. **2026 Pre-Gate Rejection Distributions I** — nakliyeci ret nedenleri ayrıntılı tablosunun ilk bölümü.
12. **2026 Pre-Gate Rejection Distributions II** — nakliyeci ret nedenleri ayrıntılı tablosunun devamı.
13. **Scope and Data Notes** — kaynak kapsam farklılıklarını kısa İngilizce notlarla açıklar.

## Veri kuralları

- Sheet1 toplamları, Sheet2 yıllık karşılaştırması ve Sheet4 ret karşılaştırması birbirinin yerine kullanılmaz.
- Kaynak kapsamları farklıysa rakamlar değiştirilmeden korunur ve son slaytta açıklanır.
- Ravago önce `Firma Adı` alanından ayrıştırılır; Alişan değeri Ravago hariç hesaplanır.
- Nakliyeci ve ret nedeni tabloları kaynak toplamlarıyla uzlaşmalıdır.
- Dönem, iki Excel kaynağında aynı ay ve yıl değilse üretim durur.

## Yeniden kullanılabilirlik

Veri çıkarma katmanı dönemi ve çıktı adını belirler. Sunum oluşturucu referans PPTX’i içe aktarır, onaylı slayt düzenlerini kopyalar veya yeniden kullanır, mevcut başlıkları ve düzenlenebilir tablo/grafik verilerini günceller ve kapsam dışı slaytları kaldırır. Doğrulanmış son sunum, kişisel bir sunum şablonu olarak kaydedilir ve sonraki aylarda aynı görsel sistemle kullanılabilir.

## Başarı ölçütleri

- Nihai sunum 13 slayttır ve referans dosyanın kurumsal görünümünü taşır.
- Fotoğraf, Blacklist, Kantar ve Back Up içeriği bulunmaz.
- Departman/firma adları dışında kullanıcıya görünen metin İngilizcedir.
- Ravago ve Alişan ayrı gösterilir.
- Düzenlenebilir tablolar ve grafikler korunur.
- Dosya adı rapor döneminden otomatik üretilir.
- Paket, geometri, yazı tipi ve görsel karşılaştırma kontrolleri bulgusuz tamamlanır.

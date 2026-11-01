# SYMN-poli-sunum Tasarım Belgesi

## Amaç

SYMN-poli-sunum, aylık Pregate Excel raporunu okuyarak profesyonel ve indirilebilir bir PowerPoint sunumu üretir. İlk örnek, Eylül 2026 verileriyle hazırlanır. Sonraki aylarda kullanıcı yalnızca güncel raporu sağlar; sistem dönem bilgisini, tabloları, grafikleri ve metinleri otomatik günceller.

## İlk örneğin kapsamı

- Ana girdi: `PregateSunum_Tam.xlsx`
- Ravago–Alişan ayrımı için ek girdi: `Arac_Kayit_Sorgulama (3).xlsx`
- Görsel referans: `EYLÜL 2026 PREGATE SUNUM.pptx`
- Çıktı: 16:9 oranında düzenlenebilir `.pptx`
- Ravago–Alişan ayrımı ek araç kayıt raporundan üretilir.
- Blacklist içeriği kapsam dışıdır.
- Kaynak dosyadaki ayrıntılı tablolar sunumun ana bölümünde kopyalanmaz; gerekli olanlar ek slaytlarda özetlenir.

## Hedef kullanım

Sunum, iç operasyon ve yönetim toplantılarında aylık sonuçları hızlı okumak için tasarlanır. Ana bölüm, temel sonuçları ve önemli değişimleri gösterir. Detaylar ek slaytlarda korunur.

## Sunum yapısı

1. **Kapak** — “Pregate Aylık Operasyon Raporu”, Eylül 2026, Poliport logosu ve tesis/Pregate fotoğrafı.
2. **Aylık özet** — toplam araç, onaylanan araç, reddedilen araç ve ret oranı.
3. **Departman bazında araç hareketleri** — onay ve ret adetlerini karşılaştıran yatay çubuk grafik.
4. **Geçen yılın aynı dönemiyle karşılaştırma** — departman bazında geçen yıl ve bu yıl araç sayıları.
5. **Retlerin yıllık karşılaştırması** — geçen yılın aynı dönemi ve cari dönem ret adetleri.
6. **Retlerin departmanlara dağılımı** — en yüksek ret adedine sahip departmanlar.
7. **Terminal ret nedenleri** — ana neden kategorilerinin dağılımı.
8. **Nakliyeci görünümü** — en yüksek ret adedine sahip nakliyeciler; kayıt adedi mevcut olduğunda ret oranı da gösterilir.
9. **Ravago ve Alişan araç dağılımı** — ek araç kayıt raporundaki `Firma Adı` ve `Nakliyeci` alanlarıyla ayrıştırılan araç adetleri.
10. **Vardiya ve aylık araç eğilimi** — Ocak–Eylül toplam araç hareketleri ve vardiya kırılımı.
11. **Boş araçlar** — en sık boş araç nedenleri ve öne çıkan firmalar.
12. **Ek veriler** — gerekli ayrıntı tabloları; sunum akışını bozmadan inceleme amacıyla.

## Veri eşlemesi

- Aylık toplamlar ve departman dağılımı: `Sheet1!B4:E21`
- Geçen yıl karşılaştırması: `Sheet2!B4:D19`
- Terminal ret ayrıntıları: `Sheet3!B4:Q55`
- Retlerin dönem karşılaştırması: `Sheet4!B4:E19`
- Boş araç nedenleri: `Sheet6!B4:D37`
- Boş araç firmaları: `Sheet7!B4:C20`
- Nakliyeci ve ana ret nedeni matrisi: `Sheet8!B4:J69`
- Nakliyeci ret adetleri: `Sheet9!B4:C69`
- Vardiya ve aylık hareketler: `Sheet10!C4:O16`
- Ham Pregate kayıtları ve kantar özeti: `Sheet14`
- Ravago–Alişan ayrımı: `Arac_Kayit_Sorgulama (3).xlsx` içindeki `Arac_Kayit_Sorgulama` çalışma sayfası
  - Ravago: `Firma Adı` alanı “RAVAGO” içerir.
  - Alişan: `Nakliyeci` alanı “ALIŞAN” içerir ve `Firma Adı` alanı “RAVAGO” içermez.
  - Eylül örnek raporunda 653 Ravago ve 132 Alişan kaydı bulunur; birlikte 785 Alişan taşıyıcı kaydını oluşturur.
  - Plaka, sürücü adı, telefon numarası ve diğer kişisel alanlar kullanılmaz veya sunuma aktarılmaz.

## Veri tutarlılığı

Kaynak dosyada farklı kapsamları temsil edebilecek toplamlar bulunur. Örneğin ana aylık tabloda 4.795 araç ve 312 ret, yıllık karşılaştırma tablosunda 4.801 araç, ret karşılaştırmasında 282 ret yer alır. İlk örnekte her slayt kendi kaynak tablosunun kapsamını korur. Farklı kapsamlı toplamlar aynı grafik içinde birleştirilmez.

Programın sonraki sürümünde aşağıdaki kontroller zorunludur:

- Ay ve yılın tüm slaytlarda aynı olması
- Eski aya ait başlıkların kalmaması
- Toplamların alt satırlarla aritmetik uyumu
- Aynı metriğin farklı sayfalardaki değerleri arasında fark varsa uyarı verilmesi
- Eksik veya boş kaynak verinin sıfır gibi gösterilmemesi
- Ek araç kayıt raporunun tarih aralığının sunum dönemiyle uyumlu olması
- Ravago ve Alişan kırılımının toplam Alişan taşıyıcı kayıtlarıyla uzlaşması

## Görsel tasarım

- 16:9 geniş ekran düzeni
- Ana renkler: Poliport mavisi, koyu lacivert, beyaz ve açık gri
- Kırmızı yalnızca ret, olumsuz değişim veya kritik uyarı için kullanılır.
- Fotoğraf yalnızca kapakta ve gerekirse bölüm geçişinde kullanılır.
- Veri slaytlarında fotoğraf yerine grafik, tipografi ve boşluk kullanılır.
- Üç boyutlu ve patlatılmış pasta grafikler kullanılmaz.
- Ana grafikler yatay çubuk, karşılaştırmalı sütun, çizgi ve sınırlı sayıda halka grafik olur.
- Uzun tablolar ana slaytlara sıkıştırılmaz.

## Yazı düzeni

- Tek yazı ailesi: Arial
- Kapak başlığı: 38–42 punto
- Slayt başlığı: 30–32 punto
- Gövde metni: 18–20 punto
- Grafik ve tablo etiketleri: okunabilirliği koruyacak şekilde en az 12–14 punto
- Tamamı büyük harf yalnızca kısa tablo başlıklarında kullanılır.
- Başlıklar kısa, doğrudan ve dönem bilgisiyle tutarlı olur.
- Yazım, noktalama ve Türkçe karakter hataları düzeltilir.
- Veriler değiştirilmez; yalnızca sunum dili ve görünümü iyileştirilir.

## Örnek sunumun başarı ölçütleri

- Sunum PowerPoint’te düzenlenebilir olmalıdır.
- Ana sonuçlar ilk iki dakika içinde anlaşılmalıdır.
- Her grafik, kaynak Excel verisiyle doğrulanmalıdır.
- Metin taşması, üst üste binme veya okunamayacak kadar küçük yazı olmamalıdır.
- Fotoğraf verilerin önüne geçmemelidir.
- Ravago–Alişan ayrımı tanımlanan kurala göre bulunmalıdır; blacklist içeriği bulunmamalıdır.
- Eylül dışındaki eski ay başlıkları sunumda kalmamalıdır.

## Sonraki aylara uyarlama

İlk örnek onaylandıktan sonra aynı düzen programlaştırılır. Kullanıcı aylık Excel raporunu yüklediğinde sistem dönemi belirler, veri eşlemelerini çalıştırır, kalite kontrollerini uygular ve `<AY> <YIL> PREGATE SUNUM.pptx` biçiminde çıktı üretir. Ay adı Türkçe büyük harfle yazılır; örnek: `EYLÜL 2026 PREGATE SUNUM.pptx`.

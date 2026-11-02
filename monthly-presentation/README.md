# Pregate aylık sunum otomasyonu

Bu proje her ay iki Excel dosyasından kurumsal PowerPoint sunumu üretir:

1. Ana Pregate raporu: sunumdaki tabloların ve analizlerin ana kaynağıdır.
2. Araç Kayıt Sorgulama raporu: yalnızca Alışan kayıtlarını Ravago ve diğer Alışan olarak ayırmak için kullanılır.

## En kolay kullanım

### İnternet bağlantısı üzerinden

[Pregate aylık sunum oluşturucuyu açın](https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/), iki Excel dosyasını seçin ve **Sunumu Oluştur** düğmesine basın. Dönem dosyalardaki veriden otomatik belirlenir; sonuç `AY YIL PREGATE SUNUM.pptx` adıyla indirilir.

Excel dosyaları tarayıcınızda yerel olarak işlenir. Dosya içeriği sunucuya yüklenmez, tarayıcı deposuna kaydedilmez ve GitHub'a gönderilmez.

### Mac masaüstü üzerinden

Mac'te `Pregate_Sunum_Olustur.command` dosyasına çift tıklayın. Açılan iki pencerede sırasıyla ana Pregate Excel dosyasını ve Araç Kayıt Sorgulama Excel dosyasını seçin.

Tamamlanan sunum `outputs` klasörüne, `AY YIL PREGATE SUNUM.pptx` adıyla kaydedilir. Aynı aya ait mevcut bir sunum varsa silinmez; `work/backups` klasörüne tarih-saat eklenerek taşınır.

## Sunum kapsamı

Üretilen 13 slaytta araç sayıları, saha dağılımı, vardiyalar, yıllık karşılaştırma, ret karşılaştırması, boş araç nedenleri ve firmaları, lojistik firmaları, departman bazında retler, iki parçalı Pre-Gate ret detayı ve kapsam/veri notları bulunur.

Alışan-Ravago ayrımında önce taşıyıcısı Alışan olan kayıtlar seçilir. Bu küme içinde firma adı Ravago olanlar `Ravago`, kalanlar `Alışan` sayılır. Böylece başka taşıyıcılara ait Ravago kayıtları yanlışlıkla toplama eklenmez.

Farklı çalışma sayfalarındaki toplamlar aynı kapsamı temsil etmiyorsa birleştirilmez; farklar son slaytta açıkça gösterilir.

## Komut satırı kullanımı

```text
python3 generate.py --pregate "/dosya/Pregate.xlsx" --vehicles "/dosya/Arac_Kayit_Sorgulama.xlsx"
```

## Eski dosyalar hakkında

Önceki konuşmalarda adı geçen `Pregate_Aylik_Sunum_Rapor_Tasarim.xlsx` ve `modPregateAylikSunum_DUZELTILMIS.bas` dosyaları bulunamadı. Bu sürüm, aynı işi Python/JavaScript tabanlı ve proje içinde taşınabilir bir şablonla yaptığı için bu iki eski dosyaya ihtiyaç duymaz.

# SYMN-poli-sunum Örnek Sunum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eylül 2026 verilerini iki Excel kaynağından okuyup Poliport renklerine yakın, fotoğraflı kapak ve düzenlenebilir grafikler içeren profesyonel bir PowerPoint örneği üretmek.

**Architecture:** Python tabanlı veri katmanı iki çalışma kitabını salt okunur biçimde işler, tanımlı metrikleri ve kalite uyarılarını tek bir JSON sunum modeline dönüştürür. JavaScript ES modülü bu modeli `@oai/artifact-tool` ile 16:9 PowerPoint’e çevirir; kaynak sunumdan yalnızca kullanıcıya ait logo ve kapak fotoğrafı alınır. Veri çıkarma, sunum modeli ve görsel üretim birbirinden ayrıdır; aynı boru hattı sonraki aylarda yeni dosya yollarıyla çalışır.

**Tech Stack:** Python 3, `openpyxl` salt okunur veri çıkarma, `pytest`, JavaScript ES modules, `@oai/artifact-tool`, sunum doğrulama yardımcıları.

**Spec:** `docs/superpowers/specs/2026-10-14-symn-poli-sunum-design.md`

## Global Constraints

- Çıktı 16:9 oranında, düzenlenebilir `.pptx` olmalıdır.
- Ana renkler Poliport mavisi, koyu lacivert, beyaz ve açık gridir; kırmızı yalnızca ret ve kritik uyarılarda kullanılır.
- Fotoğraf yalnızca kapakta veya bölüm geçişinde kullanılmalıdır.
- Tek yazı ailesi Arial olmalıdır; kapak 38–42 pt, slayt başlıkları 30–32 pt, gövde 18–20 pt, grafik ve tablo etiketleri en az 12–14 pt olmalıdır.
- Üç boyutlu veya patlatılmış pasta grafik kullanılmamalıdır.
- Ravago, `Firma Adı` alanında “RAVAGO” geçen kayıtlardır. Alişan, `Nakliyeci` alanında “ALIŞAN” geçen ve `Firma Adı` alanında “RAVAGO” geçmeyen kayıtlardır.
- Plaka, sürücü adı, telefon numarası ve diğer kişisel alanlar sunum modeline veya PowerPoint’e aktarılmamalıdır.
- Blacklist içeriği oluşturulmamalıdır.
- Kaynak toplamlar farklı kapsamları temsil ediyorsa aynı grafikte birleştirilmemeli ve kalite uyarısı kaydedilmelidir.
- Çalışma alanı Git deposu değildir; görev sonlarında commit yerine test ve dosya kontrol noktası kaydedilir.

## Review Focus

- Çalışma sayfası veya zorunlu sütun adı değişirse program açık bir eksik alan hatası vermeli; Task 1 bunu test eder.
- İki kaynak farklı ayları içerirse üretim durmalı ve dönem uyuşmazlığını belirtmeli; Task 2 bunu test eder.
- Ana tablolardaki toplamlar uzlaşmazsa program sayıları sessizce karıştırmamalı ve uyarıyı modelde tutmalı; Task 2 bunu test eder.
- “RAVAGO” ve “ALIŞAN” değerlerindeki büyük/küçük harf ile Türkçe karakter farkları sınıflandırmayı bozmamalı; Task 1 bunu test eder.
- Kişisel alanlar kaynakta bulunsa bile JSON sunum modelinde yer almamalı; Task 2 bunu test eder.

---

### Task 1: Excel veri çıkarma ve Ravago–Alişan sınıflandırması

**Files:**
- Create: `src/symn_poli_sunum/__init__.py`
- Create: `src/symn_poli_sunum/extract.py`
- Create: `tests/test_extract.py`

**Interfaces:**
- Consumes: `PregateSunum_Tam.xlsx` ve `Arac_Kayit_Sorgulama (3).xlsx` dosya yolları.
- Produces: `extract_pregate_report(path: Path) -> PregateReport`, `extract_vehicle_split(path: Path) -> VehicleSplit`, `normalize_label(value: object) -> str`.

- [ ] **Step 1: Kaynak şema ve temel toplam testlerini yaz**

`tests/test_extract.py` içinde geçici çalışma kitapları kullanarak `Sheet1`, `Sheet2`, `Sheet4`, `Sheet6`, `Sheet7`, `Sheet8`, `Sheet9`, `Sheet10`, `Sheet14` ve araç kayıt çalışma sayfasının zorunlu olduğunu; eksik sayfa veya sütunda açıklayıcı `SourceSchemaError` üretildiğini doğrula.

- [ ] **Step 2: Testleri çalıştır ve başarısız olduklarını doğrula**

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pytest tests/test_extract.py -v`

Expected: FAIL because `extract_pregate_report`, `extract_vehicle_split` and `SourceSchemaError` do not exist.

- [ ] **Step 3: Salt okunur veri sınıflarını ve çıkarıcıları uygula**

`extract.py` içinde dataclass tabanlı `PregateReport` ve `VehicleSplit` tanımla. Yalnızca tasarım belgesindeki hücre aralıklarını ve gerekli başlıkları oku; boş hücreyi sıfıra dönüştürme.

- [ ] **Step 4: Ravago–Alişan sınıflandırma testlerini ekle**

`Firma Adı` içinde farklı harf biçimleriyle Ravago bulunan kayıtların Ravago, `Nakliyeci` Alişan olup Ravago olmayanların Alişan sayıldığını ve `ravago + alisan == alisan_carrier_total` olduğunu doğrula. Eylül örnek girdileri için 653 Ravago, 132 Alişan ve 785 toplam taşıyıcı kaydı bekle.

- [ ] **Step 5: Veri çıkarma testlerini çalıştır**

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pytest tests/test_extract.py -v`

Expected: PASS.

- [ ] **Step 6: Kontrol noktası kaydet**

Record: `extract.py` yalnızca özet alanları döndürür; plaka, sürücü veya telefon alanlarını hiçbir dönüş tipine eklemez.

### Task 2: Dönem doğrulama ve sunum modeli

**Files:**
- Create: `src/symn_poli_sunum/model.py`
- Create: `src/symn_poli_sunum/cli.py`
- Create: `tests/test_model.py`

**Interfaces:**
- Consumes: Task 1’den `PregateReport` ve `VehicleSplit`.
- Produces: `build_slide_model(report: PregateReport, split: VehicleSplit) -> SlideModel`, `validate_periods(report, split) -> ReportingPeriod`, komut satırı ile JSON dosyası.

- [ ] **Step 1: Sunum modeli sözleşme testlerini yaz**

12 slaytlık sıralı model, Eylül 2026 dönem etiketi, aylık özet metrikleri, Ravago–Alişan slaydı, Blacklist başlığının bulunmaması ve kişisel alan anahtarlarının JSON’da bulunmaması için testler ekle.

- [ ] **Step 2: Dönem ve toplam tutarlılığı testlerini yaz**

İki kaynağın ayı farklıysa `PeriodMismatchError` bekle. 4.795, 4.801, 312 ve 282 gibi uzlaşmayan toplamların tek metriğe dönüştürülmediğini; modelin `warnings` alanında kaynaklarıyla saklandığını doğrula.

- [ ] **Step 3: Testleri çalıştır ve başarısız olduklarını doğrula**

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pytest tests/test_model.py -v`

Expected: FAIL because the model functions do not exist.

- [ ] **Step 4: Model ve CLI uygulamasını yaz**

`SlideModel` yalnızca sunumda gösterilecek özetleri, grafik veri dizilerini, dönem bilgisini ve uyarıları içersin. `cli.py extract --pregate <path> --vehicles <path> --output <json>` arayüzünü sağla.

- [ ] **Step 5: Model testlerini ve gerçek kaynak kontrolünü çalıştır**

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pytest tests/test_model.py -v`

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m symn_poli_sunum.cli extract --pregate '/Users/seymen/Downloads/PregateSunum_Tam.xlsx' --vehicles '/Users/seymen/Downloads/Arac_Kayit_Sorgulama (3).xlsx' --output work/symn-poli-sunum-data.json`

Expected: Tests PASS and JSON contains 12 slides, September 2026, Ravago 653, Alişan 132 and no personal fields.

- [ ] **Step 6: Kontrol noktası kaydet**

Record: `work/symn-poli-sunum-data.json` is the only input consumed by the presentation builder.

### Task 3: Poliport görsel sistemi ve kapak

**Files:**
- Create: `src/presentation/theme.mjs`
- Create: `src/presentation/assets.mjs`
- Create: `src/presentation/build_deck.mjs`
- Create: `tests/theme.test.mjs`

**Interfaces:**
- Consumes: Task 2 JSON modeli ve kullanıcıya ait referans PPTX.
- Produces: `createTheme()`, `extractReferenceAssets(referencePptx, workDir)`, `buildDeck(model, assets)`.

- [ ] **Step 1: Tema sabitleri için test yaz**

Arial yazı ailesi, 16:9 sayfa, Poliport mavisi/lacivert/beyaz/açık gri paleti, kırmızının yalnızca olumsuz vurgu rengi olması ve minimum metin boyutları için `tests/theme.test.mjs` testlerini yaz.

- [ ] **Step 2: Testi çalıştır ve başarısız olduğunu doğrula**

Run: `RUNTIME_NODE_MODULES='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules' /Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/theme.test.mjs`

Expected: FAIL because theme and asset functions do not exist.

- [ ] **Step 3: Tema ve kullanıcı varlığı çıkarımını uygula**

`assets.mjs`, referans PowerPoint’ten Poliport logosu ile tesis/Pregate fotoğrafını çalışma klasörüne çıkarır. `theme.mjs`, slayt başlıkları, gövde, dipnot ve grafik etiketleri için tek tip stili tanımlar.

- [ ] **Step 4: Kapak ve ortak slayt iskeletini uygula**

`build_deck.mjs` içinde fotoğraflı kapak, logo yerleşimi, başlık alanı, slayt numarası ve kaynak notu düzenini oluştur. Veri slaytlarına fotoğraf ekleme.

- [ ] **Step 5: Tema testini çalıştır**

Run: `RUNTIME_NODE_MODULES='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules' /Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/theme.test.mjs`

Expected: PASS.

- [ ] **Step 6: Kontrol noktası kaydet**

Record: Cover uses the user-provided photo; all other data slides use flat compositions without decorative photography.

### Task 4: Düzenlenebilir veri slaytları

**Files:**
- Modify: `src/presentation/build_deck.mjs`
- Create: `tests/deck_model.test.mjs`

**Interfaces:**
- Consumes: Task 2 `SlideModel` JSON ve Task 3 theme/assets.
- Produces: 12 slaytlı `Presentation` nesnesi ve dışa aktarma komutu.

- [ ] **Step 1: Slayt kapsamı testini yaz**

Başlıkların sırasını, 12 slayt sayısını, Ravago–Alişan slaydını, Blacklist yokluğunu ve her veri slaydında en az bir düzenlenebilir tablo veya grafik veri nesnesi bulunduğunu doğrula.

- [ ] **Step 2: Testi çalıştır ve başarısız olduğunu doğrula**

Run: `RUNTIME_NODE_MODULES='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules' /Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/deck_model.test.mjs`

Expected: FAIL because the full deck builder does not exist.

- [ ] **Step 3: Özet ve karşılaştırma slaytlarını uygula**

Aylık özet, departman hareketleri, geçen yıl karşılaştırması, ret karşılaştırması ve retlerin departman dağılımını native tablo/grafik nesneleriyle üret.

- [ ] **Step 4: Operasyon ve firma slaytlarını uygula**

Terminal ret nedenleri, nakliyeci görünümü, Ravago–Alişan dağılımı, vardiya/aylık eğilim, boş araçlar ve ek veriler slaytlarını uygula. Uzun firma listelerini ilk 10–12 satırla sınırla ve kalanları “Diğer” olarak toplulaştır.

- [ ] **Step 5: Slayt kapsamı testini çalıştır**

Run: `RUNTIME_NODE_MODULES='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules' /Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/deck_model.test.mjs`

Expected: PASS.

- [ ] **Step 6: Taslak PowerPoint’i özel çalışma klasörüne aktar**

Run: `RUNTIME_NODE_MODULES='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules' /Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node src/presentation/build_deck.mjs --data work/symn-poli-sunum-data.json --reference '/Users/seymen/Downloads/EYLÜL 2026 PREGATE SUNUM.pptx' --output work/SYMN-poli-sunum_Eylul_2026_ornek.pptx`

Expected: One editable 12-slide PPTX is created.

### Task 5: Görsel doğrulama ve teslim

**Files:**
- Modify: `src/presentation/build_deck.mjs` only for defects found during review.
- Create: `outputs/SYMN-poli-sunum_Eylul_2026_ornek.pptx`

**Interfaces:**
- Consumes: Task 4 draft PPTX.
- Produces: Verified final PPTX in `outputs/`.

- [ ] **Step 1: İçerik ve paket bütünlüğünü doğrula**

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/seymen/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations/container_tools/inspect_presentation_package_integrity.py --fail-on-findings work/SYMN-poli-sunum_Eylul_2026_ornek.pptx`

Expected: Exit 0, no broken relationships and no missing media. Separately inspect slide text and assert 12 slides with no Blacklist text.

- [ ] **Step 2: Tüm slaytları render et ve montaj oluştur**

Run: `RUNTIME_NODE='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node' RUNTIME_NODE_MODULES='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules' /Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/seymen/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations/container_tools/render_slides.py work/SYMN-poli-sunum_Eylul_2026_ornek.pptx --output_dir work/final-render --width 1600 --height 900`

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/seymen/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations/container_tools/create_montage.py --input_dir work/final-render --output_file work/final-render/contact-sheet.png --num_col 4 --cell_width 480 --cell_height 270 --gap 18 --label_mode filename`

Expected: 12 slide PNGs plus a contact sheet. Inspect every slide at readable scale for title consistency, chart labels, Turkish characters, image crop and data legibility.

- [ ] **Step 3: Geometri kontrollerini çalıştır**

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/seymen/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations/container_tools/inspect_presentation_layout_geometry.py --fail-on-findings --expected-aspect 16:9 --expected-slide-count 12 --require-uniform-font-family --required-default-font-family Arial --validate-heading-fit --validate-heading-punctuation --cover-role cover --cover-word-limit 18 work/SYMN-poli-sunum_Eylul_2026_ornek.pptx`

Expected: Exit 0 with no unintended overlaps, clipping or out-of-bounds objects. Fix findings and re-render every changed slide.

- [ ] **Step 4: Veri noktalarını kaynaklarla karşılaştır**

Spot-check 4.795 total, 4.483 approved, 312 rejected, 653 Ravago, 132 Alişan, the monthly shift totals and the top rejection categories against the two source workbooks. Preserve the documented source-scope warnings.

- [ ] **Step 5: Son PowerPoint’i dışa aktar**

Copy the verified draft to `outputs/SYMN-poli-sunum_Eylul_2026_ornek.pptx` and reopen/render the saved file to confirm the export matches the verified draft.

- [ ] **Step 6: Son test paketini çalıştır**

Run: `/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pytest tests -v`

Run: `RUNTIME_NODE_MODULES='/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules' /Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

Expected: All tests PASS and the output PPTX is present.

- [ ] **Step 7: Kontrol noktası kaydet**

Record: Final output is the only user-facing file; work renders, JSON and test fixtures remain private.

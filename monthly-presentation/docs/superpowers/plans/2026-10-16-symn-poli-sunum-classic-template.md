# SYMN Poli Sunum Klasik Şablon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Önceki ay sunumunun kurumsal tablo düzenini kullanan, fotoğraf/Kantar/Blacklist içermeyen, İngilizce ve aylık tekrar üretilebilir bir PowerPoint sistemi oluşturmak.

**Architecture:** Python veri katmanı mevcut Excel kaynaklarını doğrular ve 13 slaytlık İngilizce sunum modelini üretir. JavaScript sunum katmanı referans PPTX’i Artifact Tool ile içe aktarır, onaylı slayt yapılarını düzenlenebilir tablo ve grafiklerle günceller, kapsam dışı slaytları kaldırır ve dönem tabanlı dosya adıyla yayınlar. Doğrulanmış çıktı daha sonra kişisel sunum şablonu olarak paketlenir.

**Tech Stack:** Python 3, openpyxl, Node.js ES modules, `@oai/artifact-tool`, PowerPoint OOXML doğrulama araçları, Codex Template Creator.

**Spec:** `docs/superpowers/specs/2026-10-16-symn-poli-sunum-classic-template-design.md`

## Global Constraints

- Çıktı 16:9, 13 slayt ve düzenlenebilir `.pptx` olmalıdır.
- Fotoğraf, Blacklist, Kantar ve Back Up içeriği bulunmamalıdır.
- Departman ve firma adları dışında görünen metin İngilizce olmalıdır.
- Poliport/Polisan logoları ile referans üstbilgi ve altbilgileri korunmalıdır.
- Çıktı adı `<AY> <YIL> PREGATE SUNUM.pptx` biçiminde otomatik üretilmelidir.
- Kişisel araç ve sürücü verileri sunum modeline girmemelidir.
- `mark_artifact_operation_started.mjs` aynı sunum oluşturma işi için ikinci kez çalıştırılmamalıdır.

## Review Focus

- Eksik veya farklı dönemli Excel girdileri üretimi açık hata ile durdurmalıdır.
- `KANTAR`, `WEIGHBRIDGE`, `BLACKLIST` ve fotoğraf öğeleri son pakette bulunmamalıdır.
- İngilizce kullanıcı metni ile kaynak departman/firma adları birbirine karıştırılmamalıdır.
- Ravago ve Alişan sınıflandırması toplam Alişan taşıyıcı sayısıyla uzlaşmalıdır.
- Referans slayt içe aktarımı logoları ve footer öğelerini kaybetmemelidir.

---

### Task 1: English 13-slide data model

**Files:**
- Modify: `src/symn_poli_sunum/model.py`
- Modify: `tests/test_model.py`
- Regenerate: `work/symn-poli-sunum-data.json`

**Interfaces:**
- Consumes: `PregateReport`, `VehicleSplit`
- Produces: `build_slide_model(report, split) -> SlideModel` with 13 approved slides and `output_filename`

- [ ] **Step 1: Write failing tests** for exact 13-slide order, English titles/headers, Turkish department preservation, Kantar/Blacklist exclusion, Ravago/Alişan totals and automatic filename.
- [ ] **Step 2: Run the focused Python tests** and confirm failures identify the old 12-slide story.
- [ ] **Step 3: Implement the minimal model changes** while keeping scope warnings and aggregate-only vehicle data.
- [ ] **Step 4: Run the full Python suite** and confirm all tests pass.

### Task 2: Reference-backed classic presentation builder

**Files:**
- Modify: `src/presentation/build_deck.mjs`
- Modify: `src/presentation/assets.mjs`
- Modify: `src/presentation/theme.mjs`
- Modify: `tests/deck_model.test.mjs`
- Modify: `tests/theme.test.mjs`

**Interfaces:**
- Consumes: 13-slide JSON model and reference PPTX
- Produces: `buildDeck(model, referencePath) -> Presentation` retaining reference logos/master styling

- [ ] **Step 1: Write failing Node tests** for 13 slides, classic table-heavy evidence, no photo slides, no Kantar/Blacklist, Calibri typography and reference blue/gray palette.
- [ ] **Step 2: Run focused Node tests** and verify they fail against the modern card-based builder.
- [ ] **Step 3: Import the reference deck** and use inspect IDs/layouts to retain the approved cover, content tables, charts, logos and footer.
- [ ] **Step 4: Remove excluded slides and populate editable tables/charts** with the new model without adding photos.
- [ ] **Step 5: Run the complete Node suite** and confirm all tests pass.

### Task 3: Generate and validate the monthly deck

**Files:**
- Modify: `src/presentation/finalize_deck.mjs`
- Create: `work/EYLÜL 2026 PREGATE SUNUM.pptx`
- Create: `outputs/EYLÜL 2026 PREGATE SUNUM.pptx`

**Interfaces:**
- Consumes: generated JSON, reference PPTX, classic builder
- Produces: final 13-slide PowerPoint and private validation receipt

- [ ] **Step 1: Regenerate the JSON model** from the two Excel files and verify `output_filename`.
- [ ] **Step 2: Build the draft without an explicit output name** to prove automatic naming.
- [ ] **Step 3: Run package integrity and geometry validation** with expected 13 slides, 16:9 size and Calibri font policy.
- [ ] **Step 4: Render all final slides and compare them with the reference montage**; fix clipping, overlap, styling drift or excluded content.
- [ ] **Step 5: Publish the validated output** to `outputs/EYLÜL 2026 PREGATE SUNUM.pptx`.

### Task 4: Create the reusable personal presentation template

**Files:**
- Create through Template Creator: `${CODEX_HOME}/skills/artifact-template-*`
- Create temporary preview under: `work/template-preview/preview.png`

**Interfaces:**
- Consumes: verified final PPTX and its first-slide preview
- Produces: personal artifact-template skill for future monthly Pregate decks

- [ ] **Step 1: Render and visually inspect the first slide preview** from the verified final PPTX.
- [ ] **Step 2: Run `create-template-skill.mjs`** with one presentation reference, display name `SYMN Poli Pregate Monthly Presentation`, and a monthly-use description.
- [ ] **Step 3: Verify the generated skill name, manifest, agent metadata, retained reference and preview** exactly as Template Creator requires.

### Task 5: Final verification and handoff

**Files:**
- Modify: `work/sdd/2026-10-14-symn-poli-sunum-sample/progress.md`

**Interfaces:**
- Consumes: final PPTX, render set, validation receipt and template package
- Produces: verified user-facing PowerPoint and reusable template card

- [ ] **Step 1: Run the full Python and Node test suites** and confirm zero failures.
- [ ] **Step 2: Search final slide XML** for excluded terms and personal-data labels; confirm no matches.
- [ ] **Step 3: Confirm file name, slide count, editable table/chart counts and final hash** from fresh commands.
- [ ] **Step 4: Record completion evidence** in the progress ledger and deliver the final PPTX plus template usage card.

# Pregate Browser Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a GitHub Pages tool that accepts the two monthly Excel workbooks, generates the validated 13-slide Pregate PowerPoint entirely in the browser, and downloads it with the correct Turkish period filename.

**Architecture:** A focused static web app bundles SheetJS and PptxGenJS locally. Pure JavaScript modules parse workbooks, build the reporting model, and create the editable deck; the UI only coordinates local files and downloads. The existing repository root links to the tool, and committed build artifacts are served directly by the existing GitHub Pages root.

**Tech Stack:** JavaScript ES modules, SheetJS (`xlsx`), PptxGenJS, esbuild, Node test runner, GitHub Pages.

**Spec:** `monthly-presentation/docs/superpowers/specs/2026-11-02-pregate-browser-automation-design.md`

## Global Constraints

- Main Pregate workbook supplies every analysis except the Ravago/other-Alışan split.
- Workbook bytes and generated PPTX bytes never leave browser memory and are never persisted to LocalStorage.
- Browser build contains no CDN, telemetry, runtime fetch, or source map.
- Required formula cells use cached workbook values; missing cached values stop with a Turkish error.
- Month columns are discovered dynamically from January through December and totals stop at the report month.
- The output filename is `AY YIL PREGATE SUNUM.pptx` with Turkish uppercase month rules.
- Real monthly Excel workbooks remain untracked and absent from Git history.
- The deck has 13 slides with editable native tables/charts and excludes row-level plate, driver ID, and phone details.

## Review Focus

- A Ravago company row under a non-Alışan carrier must not enter the Ravago split; pin in Task 2 classification tests.
- Pregate and vehicle workbooks for different months must block generation with both periods shown; pin in Task 2 period tests.
- A workbook containing later month columns must not contaminate the report-month cumulative total; pin in Task 2 shift tests.
- Very dense empty-reason and carrier-rejection tables must preserve totals while fitting the slide; pin in Task 3 model/deck tests.
- A browser that blocks the first automatic download must retain a repeat-download action without re-reading files; pin in Task 4 UI tests.

---

### Task 1: Browser Project and Safe Build Contract

**Files:**
- Create: `monthly-presentation/web/package.json`
- Create: `monthly-presentation/web/scripts/build.mjs`
- Create: `monthly-presentation/web/src/privacy.js`
- Create: `monthly-presentation/web/tests/privacy.test.mjs`
- Create: `monthly-presentation/web/index.html`
- Create: `monthly-presentation/web/styles.css`

**Interfaces:**
- Produces: `assertLocalWorkbookFile(file, role)`, `readWorkbookBytes(file)`, and a production bundle at `monthly-presentation/web/assets/app.js`.

- [ ] **Step 1: Write failing privacy/build tests**
  - Assert only `.xlsx` files are accepted.
  - Assert bytes are read with `arrayBuffer()` and no storage/network API is called.
  - Assert the production bundle has no `sourceMappingURL`, `fetch(`, CDN URL, or telemetry marker.
- [ ] **Step 2: Run `node --test tests/privacy.test.mjs` and verify failure for missing interfaces.**
- [ ] **Step 3: Add the minimal package, build script, HTML/CSS shell, and privacy helpers.**
- [ ] **Step 4: Install pinned dependencies and run the privacy tests plus `npm run build`.**
- [ ] **Step 5: Commit as `feat: scaffold private browser presentation tool`.**

### Task 2: Workbook Extraction and Reporting Model

**Files:**
- Create: `monthly-presentation/web/src/normalize.js`
- Create: `monthly-presentation/web/src/extract.js`
- Create: `monthly-presentation/web/src/model.js`
- Create: `monthly-presentation/web/tests/extract.test.mjs`
- Create: `monthly-presentation/web/tests/model.test.mjs`

**Interfaces:**
- Consumes: workbook bytes from `readWorkbookBytes(file)`.
- Produces: `parsePregateWorkbook(bytes) -> PregateReport`, `parseVehicleWorkbook(bytes) -> VehicleSplit`, `buildPresentationModel(report, split) -> PresentationModel`.

- [ ] **Step 1: Write failing extraction tests for required sheets/headers, cached values, period parsing, Alışan-first Ravago classification, dynamic months, and period mismatch.**
- [ ] **Step 2: Run the targeted Node tests and verify the missing functions fail.**
- [ ] **Step 3: Implement normalization and Excel extraction with SheetJS using the same worksheet scopes as the validated Python extractor.**
- [ ] **Step 4: Implement the 13-slide model, scope warnings, dense-table grouping, and Turkish filename rules.**
- [ ] **Step 5: Compare Ekim totals against the local validated workbooks without copying them into the repository; expect total 4,504, Ravago 612, other Alışan 155.**
- [ ] **Step 6: Run all Task 2 tests and commit as `feat: port monthly workbook rules to browser`.**

### Task 3: Editable 13-Slide PowerPoint Generator

**Files:**
- Create: `monthly-presentation/web/src/deck.js`
- Create: `monthly-presentation/web/src/deck-theme.js`
- Create: `monthly-presentation/web/assets/poliport-logo.png`
- Create: `monthly-presentation/web/assets/cover-background.jpg`
- Create: `monthly-presentation/web/tests/deck.test.mjs`

**Interfaces:**
- Consumes: `PresentationModel` from Task 2.
- Produces: `buildDeck(model) -> PptxGenJS instance` and `generateDeckBlob(model) -> Blob`.

- [ ] **Step 1: Write failing deck tests for 13 slides, Turkish output name, native chart/table OOXML, and prohibited sensitive labels.**
- [ ] **Step 2: Run the deck test and verify it fails for the missing generator.**
- [ ] **Step 3: Extract and optimize the approved logo/cover assets from the project template.**
- [ ] **Step 4: Implement shared title, footer, table, chart, and scope-note helpers with the corporate blue/white theme.**
- [ ] **Step 5: Implement all 13 slides using editable PptxGenJS tables/charts; apply the existing dense-table row limits and grouping rules.**
- [ ] **Step 6: Generate an Ekim PPTX from local source workbooks, inspect the OOXML package, and render it for visual review.**
- [ ] **Step 7: Run Task 3 tests and commit as `feat: generate editable monthly deck in browser`.**

### Task 4: Upload, Progress, Error, and Download Experience

**Files:**
- Create: `monthly-presentation/web/src/app.js`
- Create: `monthly-presentation/web/src/ui.js`
- Create: `monthly-presentation/web/tests/ui.test.mjs`
- Modify: `monthly-presentation/web/index.html`
- Modify: `monthly-presentation/web/styles.css`

**Interfaces:**
- Consumes: Task 1 file helpers, Task 2 parsers/model, and Task 3 `generateDeckBlob(model)`.
- Produces: `createPresentationFromFiles(pregateFile, vehicleFile, callbacks)` and a repeatable `downloadLastDeck()` action.

- [ ] **Step 1: Write failing UI-controller tests for disabled state, Turkish progress sequence, friendly schema/period errors, and repeat download.**
- [ ] **Step 2: Run the UI tests and verify missing controller behavior fails.**
- [ ] **Step 3: Implement the controller and DOM binding without LocalStorage or workbook-content network calls.**
- [ ] **Step 4: Complete the responsive, accessible one-task interface and success summary.**
- [ ] **Step 5: Run UI and full web tests, build production assets, and commit as `feat: add monthly upload and download experience`.**

### Task 5: Repository Integration and End-to-End Verification

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `README.md`
- Modify: `monthly-presentation/README.md`
- Create: `monthly-presentation/web/tests/e2e-browser.mjs`

**Interfaces:**
- Consumes: production app from Tasks 1–4.
- Produces: root-site navigation to `/monthly-presentation/web/` and documented monthly use.

- [ ] **Step 1: Add a failing navigation/static-asset test for the direct tool URL.**
- [ ] **Step 2: Add `Aylık Sunum Oluştur` to the Pregate experience and document the local-only data flow.**
- [ ] **Step 3: Start a local static preview, upload both real Ekim workbooks in Chromium, and verify a `.pptx` download plus the repeat-download path.**
- [ ] **Step 4: Run package integrity, slide count, chart/table, sensitive-label, bundle privacy, and Git-tracking checks.**
- [ ] **Step 5: Run the original Python/Node monthly-presentation tests to prove no regression.**
- [ ] **Step 6: Commit as `feat: link monthly presentation automation`.**

### Task 6: Publish and Verify GitHub Pages

**Files:**
- Modify only if required: repository Pages configuration or workflow files discovered during publication.

**Interfaces:**
- Consumes: verified commits from Tasks 1–5.
- Produces: live URL `https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/`.

- [ ] **Step 1: Confirm the pending commit set contains no Excel inputs, output decks, secrets, or unrelated user files.**
- [ ] **Step 2: Push the completed feature branch and integrate it into the repository's Pages source (`main`/root) without discarding existing work.**
- [ ] **Step 3: Wait for the Pages deployment to reach a terminal success state.**
- [ ] **Step 4: Open the literal live URL, verify the page and production asset load successfully, and run one final two-file generation smoke test when browser file automation permits.**
- [ ] **Step 5: Report the literal live URL and any remaining verification limit; do not report completion before fresh tests and deployment evidence.**

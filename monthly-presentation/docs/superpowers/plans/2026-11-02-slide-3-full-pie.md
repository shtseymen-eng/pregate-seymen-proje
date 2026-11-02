# Slide 3 Full Pie Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build slide 3 as a filled editable pie chart with the six requested departments, one `OTHER` total, and outside labels connected to their slices.

**Architecture:** The browser model owns canonical department matching, ordering, and `OTHER` aggregation. The browser deck renderer owns native pie creation plus deterministic editable callout text and leader lines. The generated bundle remains the only website artifact changed before the approval gate.

**Tech Stack:** JavaScript, Node test runner, PptxGenJS 4, JSZip, esbuild

**Spec:** `monthly-presentation/docs/superpowers/specs/2026-11-02-slide-3-full-pie-design.md`

## Global Constraints

- Keep the existing 13-slide template and the two-Excel monthly workflow.
- Use the Pregate workbook as slide 3's data source.
- Use exact display order: Terminal, Antrepo, Kimya Sevkiyat, Yapıkim, DOW PA, DOW CM, OTHER.
- Preserve all source totals by grouping every unmatched department into `OTHER`.
- Do not publish or push until the user approves the rendered preview.

## Review Focus

- Turkish character and casing variants must still match the six named departments.
- Missing named departments must remain visible as zero-value groups without losing totals.
- Multiple unmatched departments must sum exactly into `OTHER`.
- Small adjacent slices must still receive distinct outside labels and leader lines.
- The generated PowerPoint package must contain a native pie chart, not a doughnut chart.

---

### Task 1: Canonical slide 3 data

**Files:**
- Modify: `monthly-presentation/web/src/model.js`
- Test: `monthly-presentation/web/tests/model.test.mjs`

**Interfaces:**
- Consumes: `report.departments` rows shaped as `[name, approved, rejected, total]`.
- Produces: exported `buildSiteDistributionRows(departments)` returning ordered `[displayName, total]` rows.

- [ ] **Step 1: Write the failing grouping test**

Add a test with all six named groups, Turkish/case variants, and two unmatched departments. Assert the exact seven-row order, `OTHER` sum, and total reconciliation.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --test-name-pattern="site distribution"`
Expected: FAIL because `buildSiteDistributionRows` does not exist.

- [ ] **Step 3: Implement canonical grouping**

Add `buildSiteDistributionRows(departments)` and use it for slide 3 in `buildPresentationModel`.

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `npm test -- --test-name-pattern="site distribution"`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit the test and implementation as `feat: group slide 3 departments`.

### Task 2: Filled pie and editable callouts

**Files:**
- Modify: `monthly-presentation/web/src/deck.js`
- Test: `monthly-presentation/web/tests/deck.test.mjs`

**Interfaces:**
- Consumes: Task 1's seven ordered `[displayName, total]` rows.
- Produces: exported `siteDistributionLabelLayout(rows)` and a slide 3 native pie with callout text and leader lines.

- [ ] **Step 1: Write failing layout and package tests**

Assert seven labels, one-decimal percentages, count preservation, non-overlapping label boxes, a native `<c:pieChart>` package part, no slide 3 doughnut, and slide 3 callout text containing names, counts, and percentages.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --test-name-pattern="slide 3"`
Expected: FAIL because the layout helper and filled pie do not exist.

- [ ] **Step 3: Implement the chart and callouts**

Add `siteDistributionLabelLayout(rows)` and a dedicated `addSiteDistribution` renderer using `pptx.ChartType.pie`, editable text boxes, and editable line shapes.

- [ ] **Step 4: Run deck tests and verify GREEN**

Run: `npm test -- --test-name-pattern="slide 3"`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit the test and implementation as `feat: render slide 3 as full pie`.

### Task 3: Browser bundle and visual draft

**Files:**
- Modify: `monthly-presentation/web/assets/app.js`
- Create locally: a generated draft PowerPoint and rendered slide 3 preview outside published assets.

**Interfaces:**
- Consumes: Task 1 model and Task 2 renderer.
- Produces: rebuilt browser bundle plus a locally verified draft for user approval.

- [ ] **Step 1: Run the complete browser test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Rebuild the browser bundle**

Run: `npm run build`
Expected: `assets/app.js` updates successfully.

- [ ] **Step 3: Generate the October draft from the supplied Excel files**

Use `PregateSunum_Tam (2).xlsx` and `Arac_Kayit_Sorgulama (5).xlsx` to generate the draft.

- [ ] **Step 4: Validate and inspect**

Run the PPTX package check, presentation overflow test, full render, and visual inspection of slide 3. Expected: no package errors, no overflow, seven readable outside labels, and a filled pie.

- [ ] **Step 5: Stop at the approval gate**

Provide the draft and slide 3 preview. Do not push or publish.


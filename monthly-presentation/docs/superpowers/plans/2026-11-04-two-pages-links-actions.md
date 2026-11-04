# GitHub Actions Two Pages Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generated branch-based Pages run with a repository-managed workflow whose visualization graph exposes separate links for the main Pregate site and the monthly presentation tool.

**Architecture:** A custom GitHub Pages workflow uploads the repository root once, deploys that artifact to the existing `github-pages` environment, then runs a dependent monthly-tool link job with its own environment URL. A repository test reads the workflow as text and pins the trigger, permissions, dependency order, environment labels, URLs, and live-link check before the workflow is published.

**Tech Stack:** GitHub Actions YAML, `actions/checkout@v6`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`, Node.js built-in test runner, GitHub Pages

**Spec:** `monthly-presentation/docs/superpowers/specs/2026-11-04-two-pages-links-actions-design.md`

## Global Constraints

- Keep the main site at `https://shtseymen-eng.github.io/pregate-seymen-proje/`.
- Keep the monthly tool at `https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/`.
- Show the second graph job as `Pregate Sunum Hazırlama` only after the Pages deployment succeeds.
- Publish the repository root as one Pages artifact; do not create a second repository or second site.
- Do not change monthly presentation generation, Excel parsing, PowerPoint output, or the browser interface.
- Trigger on pushes to `main` and allow `workflow_dispatch`.
- Grant only `contents: read`, `pages: write`, and `id-token: write` workflow permissions.

## Review Focus

- A workflow that uploads only `monthly-presentation/web` would break the main site; Task 1 asserts the artifact path is the repository root.
- A monthly-link job that runs before deployment can report a stale or unavailable URL; Task 1 asserts `needs: deploy`.
- Pages deployment fails without the exact Pages and OIDC permissions; Task 1 asserts all three permission values.
- A workflow without `workflow_dispatch` cannot be rerun manually from Actions; Task 1 asserts both triggers.
- A green monthly-link job must mean the URL was reachable, not merely printed; Task 1 asserts a failing `curl` health check with retries.

---

### Task 1: Pin and implement the two-link Pages workflow

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `monthly-presentation/web/tests/e2e-browser.mjs`
- Reference: `monthly-presentation/docs/superpowers/specs/2026-11-04-two-pages-links-actions-design.md`

**Interfaces:**
- Consumes: the repository root as the static Pages artifact and the two fixed public URLs from Global Constraints.
- Produces: workflow jobs `build`, `deploy`, and `pregate-presentation`; the latter two expose the main and monthly-tool environment URLs in the run graph.

- [ ] **Step 1: Write the failing workflow contract test**

Add `test("Pages workflow publishes the root site and exposes the monthly presentation link", async () => { ... })` to `monthly-presentation/web/tests/e2e-browser.mjs`. Read `.github/workflows/pages.yml` from `repositoryRoot` and assert:

- the workflow contains push-to-`main` and `workflow_dispatch` triggers;
- permissions include `contents: read`, `pages: write`, and `id-token: write`;
- the artifact action is `actions/upload-pages-artifact@v4` with `path: "."`;
- the deploy action is `actions/deploy-pages@v4` and its environment URL uses `steps.deployment.outputs.page_url`;
- the `pregate-presentation` job has `name: Pregate Sunum Hazırlama`, `needs: deploy`, and the exact monthly-tool URL;
- the monthly job runs `curl` with `--fail`, retries, and the exact monthly-tool URL.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test --test-name-pattern="Pages workflow" tests/e2e-browser.mjs`

Expected: FAIL because `.github/workflows/pages.yml` does not exist.

- [ ] **Step 3: Create the minimal custom Pages workflow**

Create `.github/workflows/pages.yml` with:

- workflow name `pages-build-deployment`;
- `push` on `main` and `workflow_dispatch`;
- the exact Global Constraints permissions;
- Pages concurrency group `pages` with `cancel-in-progress: false`;
- `build` on `ubuntu-latest` using checkout, configure-pages, and upload-pages-artifact with `path: "."`;
- `deploy` named `Ana Pregate Sistemi`, needing `build`, using environment `github-pages` and `${{ steps.deployment.outputs.page_url }}`, then `actions/deploy-pages@v4` with step id `deployment`;
- `pregate-presentation` named `Pregate Sunum Hazırlama`, needing `deploy`, using environment `pregate-sunum-hazirlama` with the exact monthly URL, then a retrying `curl --fail` check of that URL.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `node --test --test-name-pattern="Pages workflow" tests/e2e-browser.mjs`

Expected: PASS with one matching test and zero failures.

- [ ] **Step 5: Run the full browser-tool test suite**

Run: `npm test`

Working directory: `monthly-presentation/web`

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit the tested workflow and documentation**

```bash
git add .github/workflows/pages.yml \
  monthly-presentation/web/tests/e2e-browser.mjs \
  monthly-presentation/docs/superpowers/specs/2026-11-04-two-pages-links-actions-design.md \
  monthly-presentation/docs/superpowers/plans/2026-11-04-two-pages-links-actions.md
git commit -m "feat: show two Pages links in Actions"
```

### Task 2: Publish through the custom Pages workflow

**Files:**
- Verify: `.github/workflows/pages.yml`
- External setting: repository `Settings → Pages → Build and deployment → Source`

**Interfaces:**
- Consumes: the committed workflow from Task 1 and administrator access to the repository Pages setting.
- Produces: Pages source `GitHub Actions` and a completed `pages-build-deployment` run for the implementation commit.

- [ ] **Step 1: Push the implementation branch to `main`**

Run: `git push origin main`

Expected: the remote `main` advances to the Task 1 commit.

- [ ] **Step 2: Switch the Pages publishing source to GitHub Actions**

In the repository Pages settings, change `Build and deployment → Source` from branch deployment to `GitHub Actions`. Do not change the custom domain or public URLs.

- [ ] **Step 3: Start or rerun `pages-build-deployment`**

Use the Actions tab's `Run workflow` control if the push occurred before the source switch; otherwise use the run triggered by the push.

Expected: `build` completes, then `Ana Pregate Sistemi`, then `Pregate Sunum Hazırlama` completes.

### Task 3: Verify both graph links and both live sites

**Files:**
- Verify: `.github/workflows/pages.yml`
- Verify: `monthly-presentation/web/assets/app.js`

**Interfaces:**
- Consumes: the completed custom Pages run from Task 2.
- Produces: evidence that both environment URLs appear in the visualization graph and resolve to the intended pages.

- [ ] **Step 1: Inspect the completed Actions run**

Open the latest `pages-build-deployment` run and confirm the visualization graph contains:

- `Ana Pregate Sistemi` with the root Pages URL;
- `Pregate Sunum Hazırlama` with the monthly-tool URL;
- green status for `build`, `deploy`, and `pregate-presentation`.

- [ ] **Step 2: Verify the root Pages site**

Run: `curl -fsSL -o /tmp/pregate-root.html "https://shtseymen-eng.github.io/pregate-seymen-proje/?verify=<commit>"`

Expected: exit code 0 and the root page contains the existing monthly-presentation navigation.

- [ ] **Step 3: Verify the monthly presentation site and deployed bundle**

Run: `curl -fsSL -o /tmp/pregate-monthly.html "https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/?verify=<commit>"`

Expected: exit code 0 and the page references `assets/app.js?v=20261104-1`; fetching that bundle produces the same SHA-256 hash as `monthly-presentation/web/assets/app.js`.

- [ ] **Step 4: Re-run the complete local verification before reporting completion**

Run: `npm test`

Working directory: `monthly-presentation/web`

Expected: all tests pass with zero failures.

- [ ] **Step 5: Report the two user-facing links**

Return the completed Actions run link, the root site link, and the monthly presentation link. State the observed job names and live-link checks; do not claim success unless Tasks 3.1–3.4 have fresh evidence.

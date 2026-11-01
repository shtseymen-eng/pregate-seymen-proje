import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ensureFinalizationDirectories,
  finalizationRequirements,
  referenceFontPolicy,
  runtimePythonPath,
} from "../src/presentation/finalize_config.mjs";


test("finalizer enforces the approved 13-slide editable evidence contract", () => {
  const requirements = finalizationRequirements();

  assert.equal(requirements.explicitTotalSlideCount, 13);
  assert.deepEqual(requirements.requiredNativeTableOwnerSlides, [2, 4, 5, 6, 7, 8, 11, 12, 13]);
  assert.deepEqual(requirements.requiredNativeChartOwnerSlides, [3, 7, 9, 10]);
});


test("finalizer discovers the bundled Python runtime without a historical absolute path", () => {
  assert.equal(
    runtimePythonPath({}, "/Users/example"),
    "/Users/example/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3",
  );
});


test("finalizer creates output and receipt directories before workspace validation", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pregate-finalizer-"));
  const finalPath = path.join(root, "outputs", "report.pptx");
  const receiptPath = path.join(root, "work", ".codex-finalizer", "report.validation.json");

  await ensureFinalizationDirectories(finalPath, receiptPath);

  assert.equal((await fs.stat(path.dirname(finalPath))).isDirectory(), true);
  assert.equal((await fs.stat(path.dirname(receiptPath))).isDirectory(), true);
});


test("reference font policy binds the corporate template by SHA-256", () => {
  const policy = referenceFontPolicy("/tmp/reference.pptx", Buffer.from("reference"));

  assert.equal(policy.basis, "reference");
  assert.deepEqual(policy.families, ["Calibri"]);
  assert.equal(policy.referencePath, "/tmp/reference.pptx");
  assert.match(policy.referenceSha256, /^[a-f0-9]{64}$/);
});

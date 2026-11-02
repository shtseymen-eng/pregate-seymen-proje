import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");


async function privacyModule() {
  try {
    return await import("../src/privacy.js");
  } catch {
    return {};
  }
}


test("only local xlsx workbooks are accepted", async () => {
  const { assertLocalWorkbookFile } = await privacyModule();
  assert.equal(typeof assertLocalWorkbookFile, "function");

  assert.doesNotThrow(() => assertLocalWorkbookFile({ name: "Pregate.xlsx" }, "Pregate"));
  assert.throws(
    () => assertLocalWorkbookFile({ name: "Pregate.xlsm" }, "Pregate"),
    /Pregate.*\.xlsx/u,
  );
  assert.throws(
    () => assertLocalWorkbookFile(null, "Araç kayıt"),
    /Araç kayıt.*seçilmedi/u,
  );
});


test("workbook bytes are read locally with arrayBuffer only", async () => {
  const { readWorkbookBytes } = await privacyModule();
  assert.equal(typeof readWorkbookBytes, "function");

  let reads = 0;
  const bytes = new Uint8Array([80, 75, 3, 4]);
  const file = {
    name: "Pregate.xlsx",
    async arrayBuffer() {
      reads += 1;
      return bytes.buffer;
    },
  };
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("network access is forbidden");
  };
  try {
    const result = await readWorkbookBytes(file);
    assert.deepEqual([...result], [...bytes]);
    assert.equal(reads, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});


test("production bundle contains no runtime data egress or source map", async () => {
  const bundlePath = path.join(webRoot, "assets", "app.js");
  let bundle = "";
  try {
    bundle = await fs.readFile(bundlePath, "utf8");
  } catch {
    // The first RED run has no production bundle yet.
  }
  assert.ok(bundle.length > 100, "production bundle must exist");
  assert.doesNotMatch(bundle, /sourceMappingURL/u);
  assert.doesNotMatch(bundle, /\bfetch\s*\(/u);
  assert.doesNotMatch(bundle, /https?:\/\/(?:cdn|unpkg|jsdelivr)/iu);
  assert.doesNotMatch(bundle, /telemetry|analytics|sentry/iu);
});

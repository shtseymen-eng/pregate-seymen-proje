import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(webRoot, "../..");


test("root Pregate navigation links to the directly served monthly tool", async () => {
  const rootApp = await fs.readFile(path.join(repositoryRoot, "js", "app.js"), "utf8");
  assert.match(rootApp, /Aylık Sunum Oluştur/u);
  assert.match(rootApp, /href=["']monthly-presentation\/web\//u);
});


test("direct tool page references production assets that exist in the Pages path", async () => {
  const html = await fs.readFile(path.join(webRoot, "index.html"), "utf8");
  const relativeAssets = [...html.matchAll(/(?:href|src)="((?:assets\/|styles\.css)[^"]*)"/gu)].map((match) => match[1]);
  assert.deepEqual(relativeAssets.sort(), ["assets/app.js", "styles.css"]);
  for (const relativePath of relativeAssets) {
    const stats = await fs.stat(path.join(webRoot, relativePath));
    assert.ok(stats.isFile());
    assert.ok(stats.size > 100);
  }
});

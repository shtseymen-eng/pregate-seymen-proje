import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(webRoot, "../..");
const execFileAsync = promisify(execFile);


test("root Pregate navigation links to the directly served monthly tool", async () => {
  const rootApp = await fs.readFile(path.join(repositoryRoot, "js", "app.js"), "utf8");
  assert.match(rootApp, /Aylık Sunum Oluştur/u);
  assert.match(rootApp, /href=["']monthly-presentation\/web\//u);
});


test("direct tool page references production assets that exist in the Pages path", async () => {
  const html = await fs.readFile(path.join(webRoot, "index.html"), "utf8");
  const relativeAssets = [...html.matchAll(/(?:href|src)="((?:assets\/|styles\.css)[^"]*)"/gu)].map((match) => match[1]);
  assert.deepEqual(relativeAssets.sort(), ["assets/app.js?v=20261104-1", "styles.css"]);
  for (const relativePath of relativeAssets) {
    const stats = await fs.stat(path.join(webRoot, relativePath.split("?", 1)[0]));
    assert.ok(stats.isFile());
    assert.ok(stats.size > 100);
  }
});


test("Pages workflow link check follows redirects and rejects a missing destination", async (context) => {
  const server = http.createServer((request, response) => {
    if (request.url === "/start") {
      response.writeHead(302, { location: "/missing" });
      response.end();
      return;
    }
    response.writeHead(404);
    response.end("missing");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const workflow = await fs.readFile(path.join(repositoryRoot, ".github/workflows/pages.yml"), "utf8");
  const foldedCommand = workflow.match(/run: >-\n((?: {10}.+\n?)+)/u)?.[1];
  assert.ok(foldedCommand, "monthly presentation health-check command must exist");
  const port = server.address().port;
  const probeCommand = foldedCommand
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace("--retry 6", "--retry 0")
    .replace("--retry-delay 5", "--retry-delay 0")
    .replace(
      "https://shtseymen-eng.github.io/pregate-seymen-proje/monthly-presentation/web/",
      `http://127.0.0.1:${port}/start`,
    );

  await assert.rejects(execFileAsync("sh", ["-c", probeCommand]));
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
await import("./embed-brand-assets.mjs");
const appEntry = path.join(root, "src", "app.js");
let entryPoint = path.join(root, "src", "privacy.js");

try {
  await fs.access(appEntry);
  entryPoint = appEntry;
} catch {
  // Task 1 builds the privacy boundary before the application controller exists.
}

await fs.mkdir(path.join(root, "assets"), { recursive: true });
await build({
  entryPoints: [entryPoint],
  outfile: path.join(root, "assets", "app.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  sourcemap: false,
  legalComments: "none",
  charset: "utf8",
  logLevel: "info"
});

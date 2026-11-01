import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";


export function runtimePythonPath(environment = process.env, homeDirectory = os.homedir()) {
  if (environment.PREGATE_RUNTIME_PYTHON) return path.resolve(environment.PREGATE_RUNTIME_PYTHON);
  return path.join(
    homeDirectory,
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "bin",
    "python3",
  );
}


export function finalizationRequirements() {
  return {
    explicitTotalSlideCount: 13,
    requiredNativeTableOwnerSlides: [2, 4, 5, 6, 7, 8, 11, 12, 13],
    requiredNativeChartOwnerSlides: [3, 7, 9, 10],
    materializeLiteralChartWorkbooks: true,
    nativeChartTargetApplication: "powerpoint",
  };
}


export async function ensureFinalizationDirectories(finalPath, receiptPath) {
  await Promise.all([
    fs.mkdir(path.dirname(finalPath), { recursive: true }),
    fs.mkdir(path.dirname(receiptPath), { recursive: true }),
  ]);
}


export function referenceFontPolicy(referencePath, referenceBytes) {
  return {
    basis: "reference",
    families: ["Calibri"],
    referencePath,
    referenceSha256: createHash("sha256").update(referenceBytes).digest("hex"),
  };
}

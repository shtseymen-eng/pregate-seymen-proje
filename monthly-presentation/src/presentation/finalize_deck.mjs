import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { presentationPaths } from "./build_deck.mjs";


const workspaceDir = "/Users/seymen/Documents/Codex/2026-10-14/yen";
const skillDir = "/Users/seymen/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations";
const pythonExecutable = "/Users/seymen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";


function argumentValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}


const dataPath = path.resolve(argumentValue("data") ?? path.join(workspaceDir, "work/symn-poli-sunum-data.json"));
const model = JSON.parse(await fs.readFile(dataPath, "utf8"));
const { candidatePath, finalPath, receiptPath } = presentationPaths(model, workspaceDir);


const { finalizePresentation } = await import(
  pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href
);


const requirements = {
  explicitTotalSlideCount: 10,
  requiredNativeTableOwnerSlides: [2, 4, 5, 6, 7, 8],
  requiredNativeChartOwnerSlides: [3, 7, 9],
  materializeLiteralChartWorkbooks: true,
  nativeChartTargetApplication: "powerpoint",
};


const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-heading-fit",
    "--validate-heading-punctuation",
    "--require-native-table-slide",
    "2",
    "--require-native-table-slide",
    "4",
    "--require-native-table-slide",
    "5",
    "--require-native-table-slide",
    "6",
    "--require-native-table-slide",
    "7",
    "--require-native-table-slide",
    "8",
  ],
  requiredNativeTableOwnerSlides: requirements.requiredNativeTableOwnerSlides,
  fontPolicy: { basis: "design", families: ["Calibri"] },
  verifyArtifactToolImport: true,
  receiptPath,
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

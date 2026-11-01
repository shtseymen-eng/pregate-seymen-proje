import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { presentationPaths, presentationRuntimePaths } from "./build_deck.mjs";
import {
  ensureFinalizationDirectories,
  finalizationRequirements,
  referenceFontPolicy,
  runtimePythonPath,
} from "./finalize_config.mjs";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(__dirname, "../..");


function argumentValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}


export async function finalizeDeck() {
  const dataPath = path.resolve(argumentValue("data") ?? path.join(workspaceDir, "work/symn-poli-sunum-data.json"));
  const model = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const defaults = presentationPaths(model, workspaceDir);
  const candidatePath = path.resolve(argumentValue("candidate") ?? defaults.candidatePath);
  const finalPath = path.resolve(argumentValue("output") ?? defaults.finalPath);
  const receiptPath = path.join(
    workspaceDir,
    "work",
    ".codex-finalizer",
    `${path.basename(finalPath, ".pptx")}.validation.json`,
  );
  const { skillDir, artifactUtils } = await presentationRuntimePaths();
  const pythonExecutable = runtimePythonPath();
  const templatePath = path.join(workspaceDir, "templates", "pregate-classic-template.pptx");

  await ensureFinalizationDirectories(finalPath, receiptPath);


  const { finalizePresentation } = await import(pathToFileURL(artifactUtils).href);


  const requirements = finalizationRequirements();
  const tableOwners = requirements.requiredNativeTableOwnerSlides;


  const result = await finalizePresentation({
    ...requirements,
    workspaceDir,
    candidatePath,
    finalPath,
    pythonExecutable,
    integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
    layoutArgs: [
      "--expected-slide-size-emu",
      "12192000,6858000",
      "--validate-heading-fit",
      "--validate-heading-punctuation",
      ...tableOwners.flatMap((number) => ["--require-native-table-slide", String(number)]),
    ],
    requiredNativeTableOwnerSlides: tableOwners,
    fontPolicy: referenceFontPolicy(templatePath, await fs.readFile(templatePath)),
    verifyArtifactToolImport: true,
    receiptPath,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}


if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  finalizeDeck().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

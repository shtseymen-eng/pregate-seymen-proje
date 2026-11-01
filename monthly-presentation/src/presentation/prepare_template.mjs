import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { defaultReferencePath, presentationRuntimePaths, resolveTemplateSlideIndexes } from "./build_deck.mjs";


function argumentValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}


function slidesFromPresentation(presentation) {
  if (Array.isArray(presentation.slides?.items)) return presentation.slides.items;
  if (Number.isInteger(presentation.slides?.count) && typeof presentation.slides.getItem === "function") {
    return Array.from({ length: presentation.slides.count }, (_, index) => presentation.slides.getItem(index));
  }
  throw new Error("Imported presentation slides could not be enumerated.");
}


async function main() {
  const reference = argumentValue("reference");
  if (!reference) throw new Error("--reference is required when preparing the sanitized template");
  const output = path.resolve(argumentValue("output") ?? defaultReferencePath());
  const { runtimeHelpers } = await presentationRuntimePaths();
  const { importRuntimeModule } = await import(pathToFileURL(runtimeHelpers).href);
  const { FileBlob, PresentationFile } = await importRuntimeModule("@oai/artifact-tool");
  const presentation = await PresentationFile.importPptx(await FileBlob.load(path.resolve(reference)));
  const originals = [...slidesFromPresentation(presentation)];
  const indexes = resolveTemplateSlideIndexes(originals.length);
  const selected = [
    originals[indexes.cover].duplicate(),
    originals[indexes.content].duplicate(),
    originals[indexes.closing].duplicate(),
  ];
  for (const slide of originals) slide.delete();
  selected.forEach((slide, index) => slide.moveTo(index));
  await fs.mkdir(path.dirname(output), { recursive: true });
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(output);
  process.stdout.write(`${output}\n`);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

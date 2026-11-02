import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { parsePregateWorkbook, parseVehicleWorkbook } from "../src/extract.js";
import { buildPresentationModel } from "../src/model.js";
import { pregateWorkbookBytes, vehicleWorkbookBytes } from "./workbook-fixtures.mjs";


async function deckModule() {
  try {
    return await import("../src/deck.js");
  } catch {
    return {};
  }
}


function sampleModel() {
  return buildPresentationModel(
    parsePregateWorkbook(pregateWorkbookBytes()),
    parseVehicleWorkbook(vehicleWorkbookBytes({ month: 10 })),
  );
}


test("browser deck builder creates the approved 13 editable slides", async () => {
  const { buildDeck } = await deckModule();
  assert.equal(typeof buildDeck, "function");
  const deck = buildDeck(sampleModel());
  assert.equal(deck._slides.length, 13);
});


test("generated PowerPoint contains native tables and charts without sensitive record labels", async () => {
  const { generateDeckBlob } = await deckModule();
  assert.equal(typeof generateDeckBlob, "function");
  const model = sampleModel();
  const blob = await generateDeckBlob(model);
  assert.ok(blob instanceof Blob);
  assert.ok(blob.size > 20_000);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const names = Object.keys(zip.files);
  const slideNames = names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/u.test(name));
  const chartNames = names.filter((name) => /^ppt\/charts\/chart\d+\.xml$/u.test(name));
  const mediaNames = names.filter((name) => /^ppt\/media\/image[^/]*\.(?:png|jpe?g)$/iu.test(name));
  assert.equal(slideNames.length, 13);
  assert.ok(chartNames.length >= 4, `expected at least 4 native charts, found ${chartNames.length}`);
  assert.ok(mediaNames.length >= 2, "approved cover and content backgrounds must be embedded");

  const contentTypes = await zip.file("[Content_Types].xml").async("string");
  const declaredParts = [...contentTypes.matchAll(/PartName="\/([^"]+)"/gu)].map((match) => match[1]);
  const missingParts = declaredParts.filter((name) => !zip.file(name));
  assert.deepEqual(missingParts, [], `content types reference missing package parts: ${missingParts.join(", ")}`);

  const slideXml = (await Promise.all(slideNames.map((name) => zip.file(name).async("string")))).join("\n");
  assert.match(await zip.file("ppt/slides/slide1.xml").async("string"), /<p:pic>/u);
  assert.ok((slideXml.match(/<a:tbl>/gu) ?? []).length >= 9, "expected native tables on the report slides");
  assert.doesNotMatch(slideXml, /BACK UP|BLACKLIST|KANTAR|WEIGHBRIDGE|PLAKA|TELEFON|SÜRÜCÜ/iu);
  assert.equal(model.outputFilename, "EKİM 2026 PREGATE SUNUM.pptx");

  for (const slideNumber of [5, 6]) {
    const xml = await zip.file(`ppt/slides/slide${slideNumber}.xml`).async("string");
    const tableXml = xml.match(/<a:tbl>[\s\S]*?<\/a:tbl>/u)?.[0] ?? "";
    const sizes = [...tableXml.matchAll(/\bsz="(\d+)"/gu)].map((match) => Number(match[1]));
    assert.ok(Math.max(...sizes) <= 900, `slide ${slideNumber} dense table font must be at most 9pt`);
  }
});

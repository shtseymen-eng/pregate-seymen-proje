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


test("slide 3 label layout keeps all counts and one-decimal percentages outside without overlap", async () => {
  const { siteDistributionLabelLayout } = await deckModule();
  assert.equal(typeof siteDistributionLabelLayout, "function");
  const rows = [
    ["POLIPORT TERMINAL", 2868],
    ["POLIPORT KURUYÜK ANTREPO", 651],
    ["POLİSAN KİMYA SEVKİYAT", 420],
    ["POLİSAN YAPIKIM SEVKİYAT", 102],
    ["DOW PA", 161],
    ["DOW CM", 179],
    ["OTHER", 123],
  ];

  const labels = siteDistributionLabelLayout(rows);

  assert.equal(labels.length, 7);
  assert.deepEqual(labels.map((label) => label.name), rows.map((row) => row[0]));
  assert.deepEqual(labels.map((label) => label.value), rows.map((row) => row[1]));
  assert.deepEqual(labels.map((label) => label.percentText), ["63.7%", "14.5%", "9.3%", "2.3%", "3.6%", "4.0%", "2.7%"]);
  assert.deepEqual(labels.map((label) => label.side), ["left", "right", "right", "right", "right", "left", "left"]);
  for (const side of ["left", "right"]) {
    const sideLabels = labels.filter((label) => label.side === side).sort((left, right) => left.box.y - right.box.y);
    for (let index = 1; index < sideLabels.length; index += 1) {
      assert.ok(sideLabels[index - 1].box.y + sideLabels[index - 1].box.h <= sideLabels[index].box.y);
    }
  }
});


test("slide 3 PowerPoint uses a filled native pie with editable callouts and leader lines", async () => {
  const { generateDeckBlob } = await deckModule();
  assert.equal(typeof generateDeckBlob, "function");
  const model = sampleModel();
  model.slides[2].data.departments = [
    ["POLIPORT TERMINAL", 2868],
    ["POLIPORT KURUYÜK ANTREPO", 651],
    ["POLİSAN KİMYA SEVKİYAT", 420],
    ["POLİSAN YAPIKIM SEVKİYAT", 102],
    ["DOW PA", 161],
    ["DOW CM", 179],
    ["OTHER", 123],
  ];

  const blob = await generateDeckBlob(model);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const relationships = await zip.file("ppt/slides/_rels/slide3.xml.rels").async("string");
  const chartTarget = relationships.match(/Type="[^"]+\/chart" Target="\/([^"]+)"/u)?.[1];
  assert.ok(chartTarget, "slide 3 must reference a native chart part");
  const chartXml = await zip.file(chartTarget).async("string");
  const slideXml = await zip.file("ppt/slides/slide3.xml").async("string");

  assert.match(chartXml, /<c:pieChart>/u);
  assert.doesNotMatch(chartXml, /<c:doughnutChart>/u);
  for (const text of [
    "POLIPORT TERMINAL", "2,868 vehicles (63.7%)",
    "POLIPORT KURUYÜK ANTREPO", "651 vehicles (14.5%)",
    "POLİSAN KİMYA SEVKİYAT", "420 vehicles (9.3%)",
    "POLİSAN YAPIKIM SEVKİYAT", "102 vehicles (2.3%)",
    "DOW PA", "161 vehicles (3.6%)",
    "DOW CM", "179 vehicles (4.0%)",
    "OTHER", "123 vehicles (2.7%)",
  ]) assert.ok(slideXml.includes(text), `slide 3 must contain editable text: ${text}`);
  assert.ok((slideXml.match(/<a:prstGeom prst="line">/gu) ?? []).length >= 14, "each callout needs two editable leader-line segments");
});

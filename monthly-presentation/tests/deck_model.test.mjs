import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import * as deckBuilder from "../src/presentation/build_deck.mjs";


test("deck spec follows the September slide list without excluded sections or photos", async () => {
  const model = JSON.parse(await fs.readFile("work/symn-poli-sunum-data.json", "utf8"));
  const spec = deckBuilder.createDeckSpec(model);

  assert.equal(spec.length, 10);
  assert.equal(spec[0].title, "PREGATE OCTOBER 2026");
  assert.equal(spec.at(-1).title, "THANK YOU");
  assert.ok(spec.every((slide) => slide.usesPhoto === false));
  assert.ok(spec.every((slide) => slide.usesClassicTemplate === true));
  assert.ok(spec.slice(1, -1).every((slide) => slide.nativeObjects.length > 0));
  assert.ok(spec.some((slide) => slide.kind === "classic_logistics"));

  const serialized = JSON.stringify(spec).toLocaleUpperCase("tr-TR");
  for (const forbidden of ["BLACKLIST", "KANTAR", "WEIGHBRIDGE"]) {
    assert.ok(!serialized.includes(forbidden));
  }
});


test("PowerPoint point sizes are converted to the engine pixel units", () => {
  assert.equal(deckBuilder.ptToPx(12), 16);
  assert.equal(deckBuilder.ptToPx(20), 80 / 3);
});


test("automatic paths use the Turkish period-based filename", () => {
  const paths = deckBuilder.presentationPaths(
    { output_filename: "EKİM 2026 PREGATE SUNUM.pptx" },
    "/workspace",
  );

  assert.equal(paths.candidatePath, "/workspace/work/EKİM 2026 PREGATE SUNUM.pptx");
  assert.equal(paths.finalPath, "/workspace/outputs/EKİM 2026 PREGATE SUNUM.pptx");
  assert.equal(paths.receiptPath, "/workspace/work/.codex-finalizer/EKİM 2026 PREGATE SUNUM.validation.json");
});


test("classic table rows alternate white and light gray", () => {
  assert.deepEqual(deckBuilder.classicRowFills(5), ["#FFFFFF", "#F2F2F2", "#FFFFFF", "#F2F2F2", "#FFFFFF"]);
});


test("classic doughnut labels are placed outside the chart with every department preserved", () => {
  const rows = [
    ["Poliport Terminal", 64],
    ["Poliport KuruYük Antrepo", 15],
    ["POLİSAN KİMYA SEVKİYAT", 9],
    ["DOW CM", 4],
    ["DOW PA", 3],
    ["POLİSAN YAPIKIM SEVKİYAT", 3],
    ["Other", 2],
  ];

  const labels = deckBuilder.classicPieLabelLayout(rows);

  assert.equal(labels.length, 7);
  assert.deepEqual(labels.map((label) => label.name), rows.map((row) => row[0]));
  assert.deepEqual(labels.map((label) => label.percent), [64, 15, 9, 4, 3, 3, 2]);
  assert.ok(labels.filter((label) => label.side === "left").every((label) => label.label.left + label.label.width <= 330));
  assert.ok(labels.filter((label) => label.side === "right").every((label) => label.label.left >= 930));
});

import assert from "node:assert/strict";
import test from "node:test";

import * as deckBuilder from "../src/presentation/build_deck.mjs";


function classicModel() {
  const kinds = [
    "cover",
    "classic_vehicle_numbers",
    "classic_site_distribution",
    "classic_shift_table",
    "classic_year_comparison",
    "classic_rejection_comparison",
    "classic_empty_reasons",
    "classic_empty_companies",
    "classic_logistics",
    "classic_rejection_departments",
    "classic_rejection_details",
    "classic_rejection_details",
    "classic_scope_notes",
  ];
  return {
    output_filename: "EKİM 2026 PREGATE SUNUM.pptx",
    slides: kinds.map((kind, index) => ({
      kind,
      title: index === 0 ? "PREGATE OCTOBER 2026" : index === 12 ? "SCOPE AND DATA NOTES" : `SLIDE ${index + 1}`,
      data: {},
      source: "test",
    })),
  };
}


test("deck spec follows the approved 13-slide list without excluded sections or photos", () => {
  const model = classicModel();
  const spec = deckBuilder.createDeckSpec(model);

  assert.equal(spec.length, 13);
  assert.equal(spec[0].title, "PREGATE OCTOBER 2026");
  assert.equal(spec.at(-1).title, "SCOPE AND DATA NOTES");
  assert.ok(spec.every((slide) => slide.usesPhoto === false));
  assert.ok(spec.every((slide) => slide.usesClassicTemplate === true));
  assert.ok(spec.slice(1).every((slide) => slide.nativeObjects.length > 0));
  assert.ok(spec.some((slide) => slide.kind === "classic_logistics"));
  assert.equal(spec.filter((slide) => slide.kind === "classic_rejection_details").length, 2);

  const serialized = JSON.stringify(spec).toLocaleUpperCase("tr-TR");
  for (const forbidden of ["BLACKLIST", "KANTAR", "WEIGHBRIDGE"]) {
    assert.ok(!serialized.includes(forbidden));
  }
});


test("template slide selection accepts the bundled sanitized template and the original reference", () => {
  assert.deepEqual(deckBuilder.resolveTemplateSlideIndexes(3), { cover: 0, content: 1, closing: 2 });
  assert.deepEqual(deckBuilder.resolveTemplateSlideIndexes(20), { cover: 0, content: 15, closing: 14 });
  assert.throws(() => deckBuilder.resolveTemplateSlideIndexes(2), /three-slide template|original reference/i);
});


test("default template path is project-local instead of a user download", () => {
  const defaultPath = deckBuilder.defaultReferencePath();

  assert.match(defaultPath, /monthly-presentation\/templates\/pregate-classic-template\.pptx$/);
  assert.ok(!defaultPath.includes("/Downloads/"));
});


test("bundled runtime node modules are discovered without a caller-provided environment variable", () => {
  const resolved = deckBuilder.runtimeNodeModulesPath({}, "/Users/example");

  assert.equal(
    resolved,
    "/Users/example/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
  );
});


test("optional template elements can be absent from the sanitized deck", () => {
  const presentation = {
    delete() {
      throw new Error("Unknown element ID");
    },
  };

  assert.equal(deckBuilder.deleteIfPresent(presentation, "missing-shape"), false);
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

import assert from "node:assert/strict";
import test from "node:test";

import { pregateWorkbookBytes, vehicleWorkbookBytes } from "./workbook-fixtures.mjs";


async function modules() {
  try {
    return {
      ...(await import("../src/extract.js")),
      ...(await import("../src/model.js")),
    };
  } catch {
    return {};
  }
}


test("presentation model blocks mismatched workbook periods", async () => {
  const { parsePregateWorkbook, parseVehicleWorkbook, buildPresentationModel } = await modules();
  assert.equal(typeof buildPresentationModel, "function");
  const report = parsePregateWorkbook(pregateWorkbookBytes({ month: "OCTOBER" }));
  const split = parseVehicleWorkbook(vehicleWorkbookBytes({ month: 9 }));
  assert.throws(
    () => buildPresentationModel(report, split),
    /Pregate 2026-10.*araç kayıt 2026-09/u,
  );
});


test("presentation model preserves the approved 13-slide story and Turkish filename", async () => {
  const { parsePregateWorkbook, parseVehicleWorkbook, buildPresentationModel } = await modules();
  assert.equal(typeof buildPresentationModel, "function");
  const report = parsePregateWorkbook(pregateWorkbookBytes());
  const split = parseVehicleWorkbook(vehicleWorkbookBytes({ month: 10 }));
  const model = buildPresentationModel(report, split);

  assert.equal(model.outputFilename, "EKİM 2026 PREGATE SUNUM.pptx");
  assert.equal(model.slides.length, 13);
  assert.deepEqual(model.slides.map((slide) => slide.kind), [
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
  ]);
});


test("site distribution keeps the requested order and groups every remaining department as OTHER", async () => {
  const { buildSiteDistributionRows } = await modules();
  assert.equal(typeof buildSiteDistributionRows, "function");
  const departments = [
    ["Poliport Terminal", 0, 0, 2868],
    ["Poliport KuruYük Antrepo", 0, 0, 651],
    ["POLİSAN KİMYA SEVKİYAT", 0, 0, 420],
    ["Polisan Yapıkim Sevkiyat", 0, 0, 102],
    ["dow pa", 0, 0, 161],
    ["DOW CM", 0, 0, 179],
    ["ATIK SAHA", 0, 0, 45],
    ["FABRİKA SAHA(GENEL)", 0, 0, 78],
  ];

  const rows = buildSiteDistributionRows(departments);

  assert.deepEqual(rows, [
    ["POLIPORT TERMINAL", 2868],
    ["POLIPORT KURUYÜK ANTREPO", 651],
    ["POLİSAN KİMYA SEVKİYAT", 420],
    ["POLİSAN YAPIKIM SEVKİYAT", 102],
    ["DOW PA", 161],
    ["DOW CM", 179],
    ["OTHER", 123],
  ]);
  assert.equal(rows.reduce((sum, row) => sum + row[1], 0), 4504);
});


test("site distribution keeps missing requested departments as zero-value groups", async () => {
  const { buildSiteDistributionRows } = await modules();
  assert.equal(typeof buildSiteDistributionRows, "function");

  assert.deepEqual(buildSiteDistributionRows([
    ["POLIPORT TERMINAL", 0, 0, 10],
    ["ATIK SAHA", 0, 0, 2],
  ]), [
    ["POLIPORT TERMINAL", 10],
    ["POLIPORT KURUYÜK ANTREPO", 0],
    ["POLİSAN KİMYA SEVKİYAT", 0],
    ["POLİSAN YAPIKIM SEVKİYAT", 0],
    ["DOW PA", 0],
    ["DOW CM", 0],
    ["OTHER", 2],
  ]);
});


test("dense reason and rejection rows fit while every numeric total is preserved", async () => {
  const { parsePregateWorkbook, parseVehicleWorkbook, buildPresentationModel } = await modules();
  assert.equal(typeof buildPresentationModel, "function");
  const report = parsePregateWorkbook(pregateWorkbookBytes());
  report.emptyReasons = Array.from({ length: 36 }, (_, index) => [`Reason ${index + 1}`, index + 1]);
  report.carrierRejectionRows = Array.from({ length: 59 }, (_, index) => [
    `Carrier ${String(index + 1).padStart(2, "0")}`,
    1,
    2,
    3,
    4,
    5,
    15,
    20,
  ]);
  const split = parseVehicleWorkbook(vehicleWorkbookBytes({ month: 10 }));
  const model = buildPresentationModel(report, split);
  const reasonRows = model.slides[6].data.reasons;
  const rejectionRows = [...model.slides[10].data.rows, ...model.slides[11].data.rows];

  assert.equal(reasonRows.length, 16);
  assert.equal(reasonRows.reduce((sum, row) => sum + row[1], 0), 666);
  assert.equal(rejectionRows.length, 39);
  assert.equal(rejectionRows.at(-1)[0], "OTHER LOGISTICS COMPANIES");
  assert.deepEqual(
    rejectionRows.reduce((totals, row) => totals.map((value, index) => value + row[index + 1]), Array(7).fill(0)),
    [59, 118, 177, 236, 295, 885, 1180],
  );
  assert.ok(Math.abs(model.slides[10].data.rows.length - model.slides[11].data.rows.length) <= 1);
});

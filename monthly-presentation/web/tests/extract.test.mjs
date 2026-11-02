import assert from "node:assert/strict";
import test from "node:test";

import { read, write, utils } from "xlsx";

import { pregateWorkbookBytes, vehicleWorkbookBytes } from "./workbook-fixtures.mjs";


async function extractionModule() {
  try {
    return await import("../src/extract.js");
  } catch {
    return {};
  }
}


test("Pregate extraction requires every source worksheet", async () => {
  const { parsePregateWorkbook } = await extractionModule();
  assert.equal(typeof parsePregateWorkbook, "function");

  const workbook = read(pregateWorkbookBytes(), { type: "array", cellDates: true });
  delete workbook.Sheets.Sheet14;
  workbook.SheetNames = workbook.SheetNames.filter((name) => name !== "Sheet14");
  const bytes = new Uint8Array(write(workbook, { type: "array", bookType: "xlsx" }));
  assert.throws(() => parsePregateWorkbook(bytes), /Gerekli çalışma sayfası bulunamadı: Sheet14/u);
});


test("Pregate summary columns are resolved by validated headers", async () => {
  const { parsePregateWorkbook } = await extractionModule();
  assert.equal(typeof parsePregateWorkbook, "function");

  const workbook = read(pregateWorkbookBytes(), { type: "array", cellDates: true });
  workbook.Sheets.Sheet1.C4.v = "REJECTED";
  workbook.Sheets.Sheet1.D4.v = "APPROVED";
  workbook.Sheets.Sheet1.C5.v = 10;
  workbook.Sheets.Sheet1.D5.v = 90;
  workbook.Sheets.Sheet1.C6.v = 10;
  workbook.Sheets.Sheet1.D6.v = 90;
  const bytes = new Uint8Array(write(workbook, { type: "array", bookType: "xlsx" }));
  const report = parsePregateWorkbook(bytes);

  assert.deepEqual(report.departments[0], ["POLIPORT TERMINAL", 90, 10, 100]);
  assert.equal(report.summaryApproved, 90);
  assert.equal(report.summaryRejected, 10);
});


test("Pregate comparison tables accept the source workbook header labels", async () => {
  const { parsePregateWorkbook } = await extractionModule();
  assert.equal(typeof parsePregateWorkbook, "function");

  const workbook = read(pregateWorkbookBytes(), { type: "array", cellDates: true });
  workbook.Sheets.Sheet2.C4.v = "LAST YEAR (SAME PERIOD)";
  workbook.Sheets.Sheet2.D4.v = "CURRENT YEAR";
  workbook.Sheets.Sheet4.D4.v = "GEÇEN YIL (Aynı Dönem)";
  workbook.Sheets.Sheet4.E4.v = "BU YIL";
  const bytes = new Uint8Array(write(workbook, { type: "array", bookType: "xlsx" }));
  const report = parsePregateWorkbook(bytes);

  assert.deepEqual(report.yearComparison[0], ["POLIPORT TERMINAL", 80, 100]);
  assert.deepEqual(report.rejectionComparison[0], ["POLIPORT TERMINAL", 8, 10]);
});


test("Pregate extraction rejects a missing required table header", async () => {
  const { parsePregateWorkbook } = await extractionModule();
  assert.equal(typeof parsePregateWorkbook, "function");

  const workbook = read(pregateWorkbookBytes(), { type: "array", cellDates: true });
  workbook.Sheets.Sheet1.D4.v = "UNKNOWN";
  const bytes = new Uint8Array(write(workbook, { type: "array", bookType: "xlsx" }));

  assert.throws(() => parsePregateWorkbook(bytes), /Gerekli sütun bulunamadı: REJECTED/u);
});


test("Pregate extraction rejects a required formula without a cached value", async () => {
  const { parsePregateWorkbook } = await extractionModule();
  assert.equal(typeof parsePregateWorkbook, "function");
  assert.throws(
    () => parsePregateWorkbook(pregateWorkbookBytes({ missingCachedTotal: true })),
    /Toplam araç.*kaydedilmiş.*değer/u,
  );
});


test("Pregate extraction rejects missing cached formula values in every numeric source area", async () => {
  const { parsePregateWorkbook } = await extractionModule();
  assert.equal(typeof parsePregateWorkbook, "function");

  for (const [option, expectedField] of [
    ["missingCachedShiftMonth", "POLIPORT TERMINAL JANUARY"],
    ["missingCachedEmptyReason", "FİRMA TALEBİ"],
    ["missingCachedRejectionReason", "ALIŞAN LOJİSTİK A.Ş. FİRMA TALEBİ İPTAL"],
  ]) {
    assert.throws(
      () => parsePregateWorkbook(pregateWorkbookBytes({ [option]: true })),
      new RegExp(`${expectedField}.*kaydedilmiş.*değer`, "u"),
    );
  }
});


test("month columns stop at the report month even when later months exist", async () => {
  const { parsePregateWorkbook } = await extractionModule();
  assert.equal(typeof parsePregateWorkbook, "function");

  const report = parsePregateWorkbook(pregateWorkbookBytes());
  assert.deepEqual(report.period, { year: 2026, month: 10 });
  assert.deepEqual(report.shiftMonths, ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER"]);
  assert.deepEqual(report.shiftRows[0], ["08-16", "POLIPORT TERMINAL", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 55]);
  assert.equal(report.currentMonthTotal, 10);
});


test("Ravago is counted only inside Alişan carrier rows", async () => {
  const { parseVehicleWorkbook } = await extractionModule();
  assert.equal(typeof parseVehicleWorkbook, "function");

  const split = parseVehicleWorkbook(vehicleWorkbookBytes({ month: 10 }));
  assert.deepEqual(split, {
    period: { year: 2026, month: 10 },
    ravago: 1,
    alisan: 1,
    alisanCarrierTotal: 2,
  });
});


test("carrier names that merely contain ALISAN are not classified as Alişan", async () => {
  const { parseVehicleWorkbook } = await extractionModule();
  assert.equal(typeof parseVehicleWorkbook, "function");

  const split = parseVehicleWorkbook(vehicleWorkbookBytes({ month: 10, lookalikeCarrier: true }));
  assert.deepEqual(split, {
    period: { year: 2026, month: 10 },
    ravago: 1,
    alisan: 1,
    alisanCarrierTotal: 2,
  });
});


test("vehicle extraction rejects reports containing more than one month", async () => {
  const { parseVehicleWorkbook } = await extractionModule();
  assert.equal(typeof parseVehicleWorkbook, "function");
  assert.throws(
    () => parseVehicleWorkbook(vehicleWorkbookBytes({ month: 9, mixedPeriods: true })),
    /tek bir ay.*2026-09.*2026-10/u,
  );
});

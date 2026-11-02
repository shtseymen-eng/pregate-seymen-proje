import { utils, write } from "xlsx";


function sheet(rows) {
  return utils.aoa_to_sheet(rows);
}


function addSheet(workbook, name, rows) {
  utils.book_append_sheet(workbook, sheet(rows), name);
}


export function pregateWorkbookBytes({ month = "OCTOBER", year = 2026, missingCachedTotal = false } = {}) {
  const workbook = utils.book_new();
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER"];
  const monthlyValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 99];
  const sheet1 = [
    [],
    [null, `POLIPORT ${month} ${year} VEHICLE NUMBERS`],
    [],
    [null, "DEPARTMENT", "APPROVED", "REJECTED", "TOTAL"],
    [null, "POLIPORT TERMINAL", 90, 10, 100],
    [null, "TOTAL", 90, 10, 100],
  ];
  addSheet(workbook, "Sheet1", sheet1);
  if (missingCachedTotal) {
    workbook.Sheets.Sheet1.E6 = { t: "n", f: "SUM(E5:E5)" };
  }

  addSheet(workbook, "Sheet2", [
    [], [], [],
    [null, "DEPARTMENT", "PREVIOUS", "CURRENT"],
    [null, "POLIPORT TERMINAL", 80, 100],
    [null, "TOTAL", 80, 100],
  ]);
  addSheet(workbook, "Sheet4", [
    [], [], [],
    [null, "DEPARTMENT", null, "PREVIOUS", "CURRENT"],
    [null, "POLIPORT TERMINAL", null, 8, 10],
    [null, "TOTAL", null, 8, 10],
  ]);
  addSheet(workbook, "Sheet6", [
    [], [], [], [],
    [null, "FİRMA TALEBİ", null, 3],
    [null, "TANK ISLAK", null, 2],
  ]);
  addSheet(workbook, "Sheet7", [
    [], [], [],
    [null, "ALİŞAN", 3],
    [null, "RAVAGO", 2],
  ]);
  addSheet(workbook, "Sheet8", [
    [], [], [],
    [null, "LOGISTICS COMPANY", "FİRMA TALEBİ İPTAL", "DONANIMSAL", "SÜRÜCÜ", "EVRAKSAL", "KKD", "Toplam Red", "Toplam Kayıt"],
    [null, "ALIŞAN LOJİSTİK A.Ş.", 1, 2, 3, 4, 0, 10, 100],
    [null, "OTHER CARRIER", 0, 1, 0, 0, 0, 1, 20],
    [null, null, 1, 3, 3, 4, 0, 11, 120],
  ]);
  addSheet(workbook, "Sheet9", [[]]);
  addSheet(workbook, "Sheet10", [
    [], [], [],
    [null, null, "SHIFT", "DEPARTMENT", ...months],
    [null, null, "08-16", "POLIPORT TERMINAL", ...monthlyValues],
    [null, null, null, "TOTAL", ...monthlyValues],
    [null, null, "TOTAL", null, ...monthlyValues],
  ]);
  addSheet(workbook, "Sheet14", [[]]);
  return new Uint8Array(write(workbook, { type: "array", bookType: "xlsx", cellDates: true }));
}


export function vehicleWorkbookBytes({ month = 9, mixedPeriods = false } = {}) {
  const workbook = utils.book_new();
  const nextMonth = mixedPeriods ? month + 1 : month;
  addSheet(workbook, "Arac_Kayit_Sorgulama", [
    [], [], [],
    ["Kayıt Tarihi", "Nakliyeci", "Firma Adı"],
    [new Date(2026, month - 1, 1), "ALİŞAN LOJİSTİK", "RAVAGO"],
    [new Date(2026, month - 1, 2), "ALİŞAN LOJİSTİK", "BAŞKA FİRMA"],
    [new Date(2026, nextMonth - 1, 3), "OTHER CARRIER", "RAVAGO"],
  ]);
  return new Uint8Array(write(workbook, { type: "array", bookType: "xlsx", cellDates: true }));
}

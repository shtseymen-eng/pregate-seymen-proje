import { SSF, read, utils } from "xlsx";

import { MONTH_NUMBERS, normalizeLabel, periodFromTitle, periodKey } from "./normalize.js";


const REQUIRED_PREGATE_SHEETS = [
  "Sheet1", "Sheet2", "Sheet4", "Sheet6", "Sheet7", "Sheet8", "Sheet9", "Sheet10", "Sheet14",
];


function workbookFromBytes(bytes) {
  try {
    return read(bytes, { type: "array", cellDates: true, raw: true });
  } catch (error) {
    throw new Error("Excel dosyası okunamadı veya geçerli bir .xlsx dosyası değil.", { cause: error });
  }
}


function requiredSheet(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Gerekli çalışma sayfası bulunamadı: ${name}`);
  return sheet;
}


function cell(sheet, row, column) {
  return sheet[utils.encode_cell({ r: row - 1, c: column - 1 })];
}


function value(sheet, row, column) {
  return cell(sheet, row, column)?.v ?? null;
}


function bounds(sheet) {
  return utils.decode_range(sheet["!ref"] || "A1:A1");
}


function requiredInteger(sheet, row, column, fieldName) {
  const sourceCell = cell(sheet, row, column);
  if (sourceCell?.f && (sourceCell.v === undefined || sourceCell.v === null || sourceCell.v === "")) {
    throw new Error(`${fieldName} için formülün kaydedilmiş sonuç değeri bulunamadı.`);
  }
  const number = sourceCell?.v;
  if (typeof number !== "number" || !Number.isFinite(number)) {
    throw new Error(`${fieldName} sayısal değil veya kaydedilmiş değer bulunamadı.`);
  }
  return Math.trunc(number);
}


function optionalInteger(rawValue) {
  return typeof rawValue === "number" && Number.isFinite(rawValue) ? Math.trunc(rawValue) : null;
}


function optionalCellInteger(sheet, row, column, fieldName) {
  const sourceCell = cell(sheet, row, column);
  if (sourceCell?.f && (sourceCell.v === undefined || sourceCell.v === null || sourceCell.v === "")) {
    throw new Error(`${fieldName} için formülün kaydedilmiş sonuç değeri bulunamadı.`);
  }
  return optionalInteger(sourceCell?.v);
}


function hasNormalizedToken(valueToCheck, token) {
  return new RegExp(`(?:^|[^A-Z0-9])${token}(?:$|[^A-Z0-9])`, "u").test(valueToCheck);
}


function totalRow(sheet, labelColumn = 2) {
  const range = bounds(sheet);
  for (let row = range.s.r + 1; row <= range.e.r + 1; row += 1) {
    if (["TOTAL", "TOPLAM"].includes(normalizeLabel(value(sheet, row, labelColumn)))) return row;
  }
  throw new Error("Çalışma sayfasında TOTAL/TOPLAM satırı bulunamadı.");
}


function rowsUntilTotal(sheet, startRow, labelColumn = 2) {
  const result = [];
  const range = bounds(sheet);
  for (let row = startRow; row <= range.e.r + 1; row += 1) {
    const label = value(sheet, row, labelColumn);
    if (["TOTAL", "TOPLAM"].includes(normalizeLabel(label))) break;
    if (label !== null && label !== "") result.push(row);
  }
  return result;
}


function headerMap(sheet, headerRow) {
  const headers = new Map();
  const range = bounds(sheet);
  for (let column = range.s.c + 1; column <= range.e.c + 1; column += 1) {
    const key = normalizeLabel(value(sheet, headerRow, column));
    if (key) headers.set(key, column);
  }
  return headers;
}


function requireHeader(headers, displayName, aliases = []) {
  for (const candidate of [displayName, ...aliases]) {
    const column = headers.get(normalizeLabel(candidate));
    if (column) return column;
  }
  throw new Error(`Gerekli sütun bulunamadı: ${displayName}`);
}


function readCountRows(sheet, valueColumn) {
  const result = [];
  const range = bounds(sheet);
  for (let row = 5; row <= range.e.r + 1; row += 1) {
    const label = value(sheet, row, 2);
    if (label === null || label === "") continue;
    const count = optionalCellInteger(sheet, row, valueColumn, String(label).trim());
    if (count !== null) result.push([String(label).trim(), count]);
  }
  return result;
}


function parseDate(rawValue) {
  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return new Date(Date.UTC(rawValue.getFullYear(), rawValue.getMonth(), rawValue.getDate()));
  }
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const parsed = SSF.parse_date_code(rawValue);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  if (typeof rawValue === "string") {
    const text = rawValue.trim();
    let match = text.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})/u);
    if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    match = text.match(/^(\d{1,2})[./](\d{1,2})[./](20\d{2})/u);
    if (match) return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  }
  return null;
}


export function parsePregateWorkbook(bytes) {
  const workbook = workbookFromBytes(bytes);
  for (const name of REQUIRED_PREGATE_SHEETS) requiredSheet(workbook, name);

  const summarySheet = requiredSheet(workbook, "Sheet1");
  const period = periodFromTitle(value(summarySheet, 2, 2));
  const summaryHeaders = headerMap(summarySheet, 4);
  const summaryDepartmentColumn = requireHeader(summaryHeaders, "DEPARTMENT");
  const summaryApprovedColumn = requireHeader(summaryHeaders, "APPROVED");
  const summaryRejectedColumn = requireHeader(summaryHeaders, "REJECTED");
  const summaryTotalColumn = requireHeader(summaryHeaders, "TOTAL");
  const summaryTotalRow = totalRow(summarySheet, summaryDepartmentColumn);
  const departments = rowsUntilTotal(summarySheet, 5, summaryDepartmentColumn).map((row) => [
    String(value(summarySheet, row, summaryDepartmentColumn)).trim(),
    requiredInteger(summarySheet, row, summaryApprovedColumn, `${value(summarySheet, row, summaryDepartmentColumn)} onay`),
    requiredInteger(summarySheet, row, summaryRejectedColumn, `${value(summarySheet, row, summaryDepartmentColumn)} ret`),
    requiredInteger(summarySheet, row, summaryTotalColumn, `${value(summarySheet, row, summaryDepartmentColumn)} toplam`),
  ]);

  const comparisonSheet = requiredSheet(workbook, "Sheet2");
  const comparisonHeaders = headerMap(comparisonSheet, 4);
  const comparisonDepartmentColumn = requireHeader(comparisonHeaders, "DEPARTMENT");
  const comparisonPreviousColumn = requireHeader(
    comparisonHeaders,
    "PREVIOUS",
    ["LAST YEAR (SAME PERIOD)", "GEÇEN YIL (AYNI DÖNEM)"],
  );
  const comparisonCurrentColumn = requireHeader(
    comparisonHeaders,
    "CURRENT",
    ["CURRENT YEAR", "BU YIL"],
  );
  const comparisonTotalRow = totalRow(comparisonSheet, comparisonDepartmentColumn);
  const yearComparison = rowsUntilTotal(comparisonSheet, 5, comparisonDepartmentColumn).map((row) => [
    String(value(comparisonSheet, row, comparisonDepartmentColumn)).trim(),
    requiredInteger(comparisonSheet, row, comparisonPreviousColumn, `${value(comparisonSheet, row, comparisonDepartmentColumn)} geçen yıl`),
    requiredInteger(comparisonSheet, row, comparisonCurrentColumn, `${value(comparisonSheet, row, comparisonDepartmentColumn)} bu yıl`),
  ]);

  const rejectionSheet = requiredSheet(workbook, "Sheet4");
  const rejectionHeaders = headerMap(rejectionSheet, 4);
  const rejectionDepartmentColumn = requireHeader(rejectionHeaders, "DEPARTMENT");
  const rejectionPreviousColumn = requireHeader(
    rejectionHeaders,
    "PREVIOUS",
    ["LAST YEAR (SAME PERIOD)", "GEÇEN YIL (AYNI DÖNEM)"],
  );
  const rejectionCurrentColumn = requireHeader(
    rejectionHeaders,
    "CURRENT",
    ["CURRENT YEAR", "BU YIL"],
  );
  const rejectionTotalRow = totalRow(rejectionSheet, rejectionDepartmentColumn);
  const rejectionComparison = rowsUntilTotal(rejectionSheet, 5, rejectionDepartmentColumn).map((row) => [
    String(value(rejectionSheet, row, rejectionDepartmentColumn)).trim(),
    requiredInteger(rejectionSheet, row, rejectionPreviousColumn, `${value(rejectionSheet, row, rejectionDepartmentColumn)} geçen yıl ret`),
    requiredInteger(rejectionSheet, row, rejectionCurrentColumn, `${value(rejectionSheet, row, rejectionDepartmentColumn)} bu yıl ret`),
  ]);

  const reasonSheet = requiredSheet(workbook, "Sheet8");
  const reasonHeaders = headerMap(reasonSheet, 4);
  const rejectedColumn = requireHeader(reasonHeaders, "Toplam Red");
  const registeredColumn = requireHeader(reasonHeaders, "Toplam Kayıt");
  const reasonColumns = Array.from({ length: rejectedColumn - 3 }, (_, index) => index + 3);
  const rejectionReasonHeaders = reasonColumns.map((column) => String(value(reasonSheet, 4, column) ?? "").trim());
  const carrierRejectionRows = [];
  const carriers = [];
  let rejectionReasons = [];
  const reasonBounds = bounds(reasonSheet);
  for (let row = 5; row <= reasonBounds.e.r + 1; row += 1) {
    const label = value(reasonSheet, row, 2);
    if (label === null || label === "") {
      const candidate = reasonColumns
        .map((column, index) => [
          rejectionReasonHeaders[index],
          optionalCellInteger(reasonSheet, row, column, `${rejectionReasonHeaders[index]} toplam ret`),
        ])
        .filter(([, count]) => count !== null);
      if (candidate.length) rejectionReasons = candidate;
      continue;
    }
    const rejected = optionalCellInteger(reasonSheet, row, rejectedColumn, `${label} Toplam Red`);
    const registered = optionalCellInteger(reasonSheet, row, registeredColumn, `${label} Toplam Kayıt`);
    if (rejected === null || registered === null) continue;
    const name = String(label).trim();
    const reasonValues = reasonColumns.map((column, index) => (
      optionalCellInteger(reasonSheet, row, column, `${label} ${rejectionReasonHeaders[index]}`) ?? 0
    ));
    carriers.push([name, rejected, registered]);
    carrierRejectionRows.push([name, ...reasonValues, rejected, registered]);
  }

  const trendSheet = requiredSheet(workbook, "Sheet10");
  const trendBounds = bounds(trendSheet);
  const monthColumns = [];
  for (let column = trendBounds.s.c + 1; column <= trendBounds.e.c + 1; column += 1) {
    const rawName = value(trendSheet, 4, column);
    const number = MONTH_NUMBERS.get(normalizeLabel(rawName));
    if (number && number <= period.month) monthColumns.push({ column, name: String(rawName), number });
  }
  monthColumns.sort((left, right) => left.number - right.number || left.column - right.column);
  if (!monthColumns.some(({ number }) => number === period.month)) {
    throw new Error(`Sheet10 içinde rapor ayı sütunu bulunamadı: ${periodKey(period)}`);
  }
  const shiftMonths = monthColumns.map(({ name }) => name);
  let monthlyTotals = [];
  const currentShiftTotals = [];
  const shiftRows = [];
  let activeShift = null;
  for (let row = 5; row <= trendBounds.e.r + 1; row += 1) {
    const shiftCell = value(trendSheet, row, 3);
    const departmentCell = value(trendSheet, row, 4);
    if (shiftCell !== null && shiftCell !== "") activeShift = String(shiftCell).trim();
    const shiftKey = normalizeLabel(shiftCell);
    const departmentKey = normalizeLabel(departmentCell);
    if (shiftKey === "TOTAL" && (departmentCell === null || departmentCell === "")) {
      monthlyTotals = monthColumns.map(({ column, name }) => [name, requiredInteger(trendSheet, row, column, `${name} toplam`)]);
    } else if (departmentKey === "TOTAL" && activeShift && normalizeLabel(activeShift) !== "TOTAL") {
      const currentColumn = monthColumns.find(({ number }) => number === period.month).column;
      const current = optionalCellInteger(trendSheet, row, currentColumn, `${activeShift} rapor ayı toplamı`);
      if (current !== null) currentShiftTotals.push([activeShift, current]);
    } else if (departmentKey && activeShift && normalizeLabel(activeShift) !== "TOTAL") {
      const monthValues = monthColumns.map(({ column, name }) => (
        optionalCellInteger(trendSheet, row, column, `${String(departmentCell).trim()} ${name}`) ?? 0
      ));
      shiftRows.push([activeShift, String(departmentCell).trim(), monthValues, monthValues.reduce((sum, count) => sum + count, 0)]);
    }
  }
  const currentMonthTotal = monthlyTotals.find((_, index) => monthColumns[index]?.number === period.month)?.[1]
    ?? requiredInteger(summarySheet, summaryTotalRow, summaryTotalColumn, "Toplam araç");

  return {
    period,
    summaryTotal: requiredInteger(summarySheet, summaryTotalRow, summaryTotalColumn, "Toplam araç"),
    summaryApproved: requiredInteger(summarySheet, summaryTotalRow, summaryApprovedColumn, "Onaylanan araç"),
    summaryRejected: requiredInteger(summarySheet, summaryTotalRow, summaryRejectedColumn, "Reddedilen araç"),
    comparisonTotal: requiredInteger(comparisonSheet, comparisonTotalRow, comparisonCurrentColumn, "Karşılaştırma cari toplam"),
    comparisonPreviousTotal: requiredInteger(comparisonSheet, comparisonTotalRow, comparisonPreviousColumn, "Karşılaştırma önceki toplam"),
    rejectionComparisonTotal: requiredInteger(rejectionSheet, rejectionTotalRow, rejectionCurrentColumn, "Ret karşılaştırma cari toplam"),
    rejectionComparisonPreviousTotal: requiredInteger(rejectionSheet, rejectionTotalRow, rejectionPreviousColumn, "Ret karşılaştırma önceki toplam"),
    departments,
    yearComparison,
    rejectionComparison,
    rejectionReasons,
    rejectionReasonHeaders,
    carrierRejectionRows,
    carriers,
    emptyReasons: readCountRows(requiredSheet(workbook, "Sheet6"), 4),
    emptyCompanies: readCountRows(requiredSheet(workbook, "Sheet7"), 3),
    monthlyTotals,
    currentShiftTotals,
    shiftMonths,
    shiftRows,
    currentMonthTotal,
  };
}


export function parseVehicleWorkbook(bytes) {
  const workbook = workbookFromBytes(bytes);
  const sheet = requiredSheet(workbook, "Arac_Kayit_Sorgulama");
  const headers = headerMap(sheet, 4);
  const dateColumn = requireHeader(headers, "Kayıt Tarihi");
  const carrierColumn = requireHeader(headers, "Nakliyeci");
  const companyColumn = requireHeader(headers, "Firma Adı");
  const periods = new Set();
  let ravago = 0;
  let alisan = 0;
  let alisanCarrierTotal = 0;
  const range = bounds(sheet);
  for (let row = 5; row <= range.e.r + 1; row += 1) {
    const date = parseDate(value(sheet, row, dateColumn));
    if (!date) continue;
    periods.add(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    const carrier = normalizeLabel(value(sheet, row, carrierColumn));
    const company = normalizeLabel(value(sheet, row, companyColumn));
    if (!hasNormalizedToken(carrier, "ALISAN")) continue;
    alisanCarrierTotal += 1;
    if (hasNormalizedToken(company, "RAVAGO")) ravago += 1;
    else alisan += 1;
  }
  if (!periods.size) throw new Error("Araç kayıt raporunda geçerli Kayıt Tarihi bulunamadı.");
  if (periods.size !== 1) {
    throw new Error(`Araç kayıt raporu tek bir ay içermeli; bulunan dönemler: ${[...periods].sort().join(", ")}`);
  }
  const [year, month] = [...periods][0].split("-").map(Number);
  return { period: { year, month }, ravago, alisan, alisanCarrierTotal };
}

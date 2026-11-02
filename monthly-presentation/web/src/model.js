import { ENGLISH_MONTHS, TURKISH_MONTHS, normalizeLabel, periodKey, turkishUpper } from "./normalize.js";


const EMPTY_REASON_LABELS = new Map([
  ["FIRMA TALEBI", "Company request"],
  ["TANK ISLAK", "Wet tank"],
  ["SEVKIYAT TALIMATIYLA BOS CIKIS YAPILDI", "Empty exit per shipment instruction"],
  ["TANK DEGISECEK", "Tank replacement"],
  ["KONYEYNER TAHLIYE VANASI BOZUK", "Container discharge valve fault"],
  ["DORSE PLAKASI YANLIS", "Incorrect trailer plate"],
  ["HAVUZLARDA SU OLDUGU ICIN ARAC CIKARTILDI", "Water detected in containment basin"],
  ["KAPALI DOLUM APARATLARI UYGUN DEGIL", "Loading equipment unsuitable"],
]);

const REJECTION_LABELS = new Map([
  ["FIRMA TALEBI IPTAL", "COMPANY REQUEST / CANCELLATION"],
  ["DONANIMSAL", "EQUIPMENT"],
  ["SURUCU", "DRIVER"],
  ["EVRAKSAL", "DOCUMENTATION"],
  ["KKD", "PPE"],
]);


function warningsFor(report, split) {
  const warnings = [];
  if (report.comparisonTotal !== report.summaryTotal) {
    warnings.push({ code: "TOTAL_SCOPE_MISMATCH", sources: { Sheet1: report.summaryTotal, Sheet2: report.comparisonTotal } });
  }
  if (report.rejectionComparisonTotal !== report.summaryRejected) {
    warnings.push({ code: "REJECTION_SCOPE_MISMATCH", sources: { Sheet1: report.summaryRejected, Sheet4: report.rejectionComparisonTotal } });
  }
  if (split.ravago + split.alisan !== split.alisanCarrierTotal) {
    warnings.push({ code: "CARRIER_SPLIT_MISMATCH", sources: split });
  }
  const alisanRegistered = report.carriers.find(([name]) => normalizeLabel(name) === "ALISAN LOJISTIK A.S.")?.[2];
  if (alisanRegistered !== undefined && alisanRegistered !== split.alisanCarrierTotal) {
    warnings.push({ code: "ALISAN_SCOPE_MISMATCH", sources: { Sheet8: alisanRegistered, vehicleRegistry: split.alisanCarrierTotal } });
  }
  return warnings;
}


function summarizeReasons(rows, maxRows = 16) {
  const ordered = [...rows].sort((left, right) => right[1] - left[1] || normalizeLabel(left[0]).localeCompare(normalizeLabel(right[0])));
  if (ordered.length <= maxRows) return ordered;
  return [
    ...ordered.slice(0, maxRows - 1),
    ["Other reasons", ordered.slice(maxRows - 1).reduce((sum, row) => sum + row[1], 0)],
  ];
}


function summarizeRejectionRows(rows, maxRows = 39) {
  if (rows.length <= maxRows) return { rows, groupedCount: 0 };
  const visible = rows.slice(0, maxRows - 1);
  const grouped = rows.slice(maxRows - 1);
  const aggregate = ["OTHER LOGISTICS COMPANIES"];
  for (let column = 1; column < rows[0].length; column += 1) {
    aggregate.push(grouped.reduce((sum, row) => sum + Number(row[column] ?? 0), 0));
  }
  return { rows: [...visible, aggregate], groupedCount: grouped.length };
}


function noteForWarning(warning) {
  if (warning.code === "TOTAL_SCOPE_MISMATCH") return `Vehicle totals differ by source scope: Sheet1 shows ${warning.sources.Sheet1.toLocaleString("tr-TR")}; Sheet2 shows ${warning.sources.Sheet2.toLocaleString("tr-TR")}.`;
  if (warning.code === "REJECTION_SCOPE_MISMATCH") return `Rejection totals differ by source scope: Sheet1 shows ${warning.sources.Sheet1.toLocaleString("tr-TR")}; Sheet4 shows ${warning.sources.Sheet4.toLocaleString("tr-TR")}.`;
  if (warning.code === "ALISAN_SCOPE_MISMATCH") return `Alişan totals differ by source scope: the Pregate logistics table shows ${warning.sources.Sheet8.toLocaleString("tr-TR")}; the vehicle registration report shows ${warning.sources.vehicleRegistry.toLocaleString("tr-TR")}.`;
  return "The Ravago and other Alişan split does not reconcile to the Alişan carrier total.";
}


export function buildPresentationModel(report, split) {
  if (periodKey(report.period) !== periodKey(split.period)) {
    throw new Error(`Kaynak dönemleri uyuşmuyor: Pregate ${periodKey(report.period)}, araç kayıt ${periodKey(split.period)}.`);
  }
  const monthEnglish = ENGLISH_MONTHS[report.period.month - 1];
  const monthTurkish = TURKISH_MONTHS[report.period.month - 1];
  const previousYear = report.period.year - 1;
  const warnings = warningsFor(report, split);

  let alisanFound = false;
  let alisanOriginal = 0;
  let alisanAdjusted = 0;
  const adjustedCarriers = [];
  for (const [name, , registered] of report.carriers) {
    if (normalizeLabel(name) === "ALISAN LOJISTIK A.S.") {
      if (split.ravago > registered) throw new Error(`Ravago sayısı (${split.ravago}) Pregate Alişan toplamını (${registered}) aşamaz.`);
      alisanFound = true;
      alisanOriginal = registered;
      alisanAdjusted = registered - split.ravago;
      adjustedCarriers.push([name, alisanAdjusted], ["RAVAGO", split.ravago]);
    } else {
      adjustedCarriers.push([name, registered]);
    }
  }
  if (!alisanFound) throw new Error("ALIŞAN LOJİSTİK A.Ş. Pregate lojistik tablosunda bulunamadı.");
  const logistics = adjustedCarriers
    .filter(([name, count]) => count >= 30 || ["ALISAN LOJISTIK A.S.", "RAVAGO"].includes(normalizeLabel(name)))
    .sort((left, right) => right[1] - left[1] || normalizeLabel(left[0]).localeCompare(normalizeLabel(right[0])));

  const translatedReasonTotals = new Map();
  for (const [label, count] of report.emptyReasons) {
    const key = normalizeLabel(label).replace(/\.$/u, "");
    const translated = EMPTY_REASON_LABELS.get(key) ?? String(label).trim();
    translatedReasonTotals.set(translated, (translatedReasonTotals.get(translated) ?? 0) + count);
  }
  const emptyReasons = summarizeReasons([...translatedReasonTotals.entries()]);
  const rejectionDepartments = report.departments
    .filter(([, , rejected]) => rejected > 0)
    .map(([name, , rejected]) => [name, rejected])
    .sort((left, right) => right[1] - left[1] || normalizeLabel(left[0]).localeCompare(normalizeLabel(right[0])));
  const orderedRejectionRows = [...report.carrierRejectionRows]
    .sort((left, right) => Number(right.at(-2)) - Number(left.at(-2)) || normalizeLabel(left[0]).localeCompare(normalizeLabel(right[0])));
  const summarized = summarizeRejectionRows(orderedRejectionRows);
  const rejectionSplit = Math.ceil(summarized.rows.length / 2);
  const rejectionHeaders = report.rejectionReasonHeaders.map((header) => REJECTION_LABELS.get(normalizeLabel(header)) ?? String(header).trim());
  const notes = [
    `Reporting period: ${monthEnglish[0]}${monthEnglish.slice(1).toLowerCase()} ${report.period.year}.`,
    "Each slide preserves the scope of its source worksheet; totals from different scopes are not combined.",
    `Ravago is separated only within Alişan carrier records: ${split.ravago} Ravago and ${split.alisan} other Alişan records.`,
    "All values are aggregated; plate, driver and phone details are excluded.",
  ];
  if (summarized.groupedCount) notes.push(`Rejection detail tables show 38 companies separately; the remaining ${summarized.groupedCount} companies are grouped as Other Logistics Companies.`);
  notes.push(...warnings.map(noteForWarning));

  const slides = [
    { title: `PREGATE ${monthEnglish} ${report.period.year}`, kind: "cover", data: { subtitle: "Monthly Operations Presentation" } },
    { title: `${report.period.year} - ${monthEnglish} VEHICLE NUMBERS`, kind: "classic_vehicle_numbers", data: { departments: report.departments, approved: report.summaryApproved, rejected: report.summaryRejected, total: report.summaryTotal } },
    { title: "PREGATE SITE SERVICE PERCENTAGE DISTRIBUTION", kind: "classic_site_distribution", data: { departments: report.departments.map(([name, , , total]) => [name, total]) } },
    { title: `POLIPORT ${report.period.year} VEHICLE LIST BY SHIFT`, kind: "classic_shift_table", data: { months: report.shiftMonths, rows: report.shiftRows, monthlyTotals: report.monthlyTotals, currentShiftTotals: report.currentShiftTotals, currentMonthTotal: report.currentMonthTotal } },
    { title: `INSPECTED VEHICLES ${previousYear}-${report.period.year}`, kind: "classic_year_comparison", data: { departments: report.yearComparison, previousTotal: report.comparisonPreviousTotal, currentTotal: report.comparisonTotal } },
    { title: `${previousYear}-${report.period.year} TOTAL NUMBER OF REJECTIONS`, kind: "classic_rejection_comparison", data: { departments: report.rejectionComparison, previousTotal: report.rejectionComparisonPreviousTotal, currentTotal: report.rejectionComparisonTotal } },
    { title: `POLIPORT TERMINAL ${monthEnglish} EMPTY TRUCKS`, kind: "classic_empty_reasons", data: { reasons: emptyReasons, total: emptyReasons.reduce((sum, row) => sum + row[1], 0) } },
    { title: "POLIPORT TERMINAL — EMPTY VEHICLES BY COMPANY", kind: "classic_empty_companies", data: { companies: report.emptyCompanies, total: report.emptyCompanies.reduce((sum, row) => sum + row[1], 0) } },
    { title: `“PREGATE ${monthEnglish} LOGISTICS COMPANIES / +30 VEHICLES”`, kind: "classic_logistics", data: { carriers: logistics, ravago: split.ravago, alisanOriginal, alisanAdjusted } },
    { title: `${report.period.year} - ${monthEnglish} REJECTION DISTRIBUTION BY DEPARTMENTS`, kind: "classic_rejection_departments", data: { departments: rejectionDepartments, total: rejectionDepartments.reduce((sum, row) => sum + row[1], 0) } },
    { title: `${report.period.year} PRE-GATE REJECTION DISTRIBUTIONS I`, kind: "classic_rejection_details", data: { part: 1, headers: rejectionHeaders, rows: summarized.rows.slice(0, rejectionSplit) } },
    { title: `${report.period.year} PRE-GATE REJECTION DISTRIBUTIONS II`, kind: "classic_rejection_details", data: { part: 2, headers: rejectionHeaders, rows: summarized.rows.slice(rejectionSplit) } },
    { title: "SCOPE AND DATA NOTES", kind: "classic_scope_notes", data: { notes } },
  ];

  return {
    period: { ...report.period, label: `${monthTurkish} ${report.period.year}`, iso: periodKey(report.period) },
    outputFilename: `${turkishUpper(`${monthTurkish} ${report.period.year}`)} PREGATE SUNUM.pptx`,
    slides,
    warnings,
    summary: { total: report.summaryTotal, ravago: split.ravago, alisan: split.alisan },
  };
}

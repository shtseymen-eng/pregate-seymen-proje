import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";

import { CONTENT_BACKGROUND_DATA, COVER_BACKGROUND_DATA } from "./brand-assets.generated.js";
import { DECK_THEME, fitRowHeight, number } from "./deck-theme.js";


const { colors, font } = DECK_THEME;


function headerCell(text) {
  return { text: String(text), options: { bold: true, color: colors.white, fill: colors.sky, align: "center", valign: "mid" } };
}


function totalCell(text, align = "center") {
  return { text: String(text), options: { bold: true, color: colors.red, fill: colors.white, align, valign: "mid" } };
}


function addContentFrame(slide, title, pageNumber) {
  slide.background = { color: colors.white };
  slide.addImage({ data: CONTENT_BACKGROUND_DATA, x: 0, y: 0, w: 13.333, h: 7.5 });
  slide.addText(title, { x: 3.05, y: 0.13, w: 9.55, h: 0.45, fontFace: font, fontSize: 22, bold: true, color: colors.navy, align: "center", margin: 0, breakLine: false, fit: "shrink" });
  slide.addText(String(pageNumber), { x: 6.45, y: 7.19, w: 0.42, h: 0.18, fontFace: font, fontSize: 8, color: "777777", align: "center", margin: 0 });
}


function tableOptions({ x = 0.38, y = 0.88, w = 12.57, h = 5.96, colW, rowH, fontSize = 9, margin = 0.06 } = {}) {
  return {
    x, y, w, h, colW, rowH,
    fontFace: font,
    fontSize,
    color: colors.text,
    margin,
    border: { type: "solid", color: colors.line, pt: 0.6 },
    valign: "mid",
    autoFit: false,
    fill: colors.white,
  };
}


function stripedRows(rows, { total = false } = {}) {
  return rows.map((row, rowIndex) => row.map((cell, columnIndex) => {
    if (rowIndex === 0 || (total && rowIndex === rows.length - 1)) return cell;
    if (typeof cell === "object" && cell?.text !== undefined) return cell;
    return { text: String(cell), options: { fill: rowIndex % 2 ? colors.white : colors.row, align: columnIndex === 0 ? "left" : "center" } };
  }));
}


function addChart(slide, pptx, type, rows, options = {}) {
  const labels = rows.map((row) => String(row[0]));
  const values = rows.map((row) => Number(row[1] ?? 0));
  slide.addChart(type, [{ name: "Vehicles", labels, values }], {
    x: 0.75, y: 1.05, w: 11.8, h: 5.65,
    showTitle: false,
    showLegend: false,
    showValue: true,
    showCategoryName: false,
    catAxisLabelFontFace: font,
    catAxisLabelFontSize: 10,
    valAxisLabelFontFace: font,
    valAxisLabelFontSize: 9,
    chartColors: [colors.blue, colors.sky, "9DC3E6", "70AD47", "A5A5A5", "FFC000", "264478"],
    showCatName: true,
    showPercent: type === pptx.ChartType.doughnut,
    holeSize: 56,
    showValAxisTitle: false,
    showCatAxisTitle: false,
    gridLine: { color: colors.pale, pt: 1 },
    border: { color: colors.white, pt: 0 },
    ...options,
  });
}


function addCover(slide, model) {
  slide.background = { color: colors.white };
  slide.addImage({ data: COVER_BACKGROUND_DATA, x: 0, y: 0, w: 13.333, h: 7.5 });
  slide.addText(model.slides[0].title, { x: 0.75, y: 1.2, w: 8.8, h: 0.8, fontFace: font, fontSize: 29, bold: true, color: colors.white, margin: 0, fit: "shrink" });
  slide.addText(model.slides[0].data.subtitle, { x: 0.8, y: 2.1, w: 6.8, h: 0.4, fontFace: font, fontSize: 17, color: colors.white, margin: 0 });
  slide.addText(model.period.label, { x: 0.8, y: 2.65, w: 3.8, h: 0.35, fontFace: font, fontSize: 14, bold: true, color: colors.white, margin: 0 });
}


function addVehicleNumbers(slide, modelSlide) {
  const rows = [
    [headerCell("DEPARTMENT"), headerCell("APPROVED"), headerCell("REJECTED"), headerCell("TOTAL")],
    ...modelSlide.data.departments.map(([name, approved, rejected, total]) => [name, number(approved), number(rejected), number(total)]),
    [totalCell("TOTAL", "left"), totalCell(number(modelSlide.data.approved)), totalCell(number(modelSlide.data.rejected)), totalCell(number(modelSlide.data.total))],
  ];
  slide.addTable(stripedRows(rows, { total: true }), tableOptions({ x: 0.5, y: 1.02, w: 12.35, h: 5.82, colW: [5.1, 2.4, 2.4, 2.45], rowH: fitRowHeight(rows.length, 5.82, 0.55, 0.5), fontSize: 11 }));
}


function addShiftTable(slide, modelSlide) {
  const header = [headerCell("SHIFT"), headerCell("DEPARTMENT"), ...modelSlide.data.months.map(headerCell), headerCell(`${modelSlide.title.slice(9, 13)}\nTOTAL`)];
  const rows = [header];
  for (const [shift, department, values, total] of modelSlide.data.rows) rows.push([shift, department, ...values.map(number), number(total)]);
  const totals = new Map(modelSlide.data.monthlyTotals);
  rows.push([totalCell("TOTAL", "left"), totalCell(""), ...modelSlide.data.months.map((month) => totalCell(number(totals.get(month) ?? 0))), totalCell(number(modelSlide.data.rows.reduce((sum, row) => sum + row[3], 0)))]);
  const available = 12.45 - 2.65;
  const monthWidth = available / (modelSlide.data.months.length + 1);
  slide.addTable(stripedRows(rows, { total: true }), tableOptions({ x: 0.37, y: 1.02, w: 12.58, h: 5.82, colW: [0.75, 1.9, ...Array(modelSlide.data.months.length + 1).fill(monthWidth)], rowH: fitRowHeight(rows.length, 5.82, 0.55, 0.5), fontSize: 7.5, margin: 0.025 }));
}


function addComparisonTable(slide, modelSlide, headers) {
  const rows = [
    [headerCell("DEPARTMENT"), ...headers.map(headerCell)],
    ...modelSlide.data.departments.map(([name, previous, current]) => [name, number(previous), number(current)]),
    [totalCell("TOTAL", "left"), totalCell(number(modelSlide.data.previousTotal)), totalCell(number(modelSlide.data.currentTotal))],
  ];
  slide.addTable(stripedRows(rows, { total: true }), tableOptions({ x: 0.75, y: 1.05, w: 11.85, h: 5.65, colW: [6.05, 2.9, 2.9], rowH: fitRowHeight(rows.length, 5.65, 0.5, 0.45), fontSize: 9, margin: 0.03 }));
}


function addEmptyReasons(slide, pptx, modelSlide) {
  const rows = [
    [headerCell("REASON"), headerCell("UNIT")],
    ...modelSlide.data.reasons.map(([label, count]) => [label, number(count)]),
    [totalCell("TOTAL", "left"), totalCell(number(modelSlide.data.total))],
  ];
  slide.addTable(stripedRows(rows, { total: true }), tableOptions({ x: 0.45, y: 0.96, w: 7.65, h: 5.86, colW: [6.5, 1.15], rowH: fitRowHeight(rows.length, 5.86, 0.48, 0.4), fontSize: rows.length > 12 ? 7.2 : 9 }));
  const chartRows = modelSlide.data.reasons.slice(0, 5).reverse();
  addChart(slide, pptx, pptx.ChartType.bar, chartRows, { x: 8.35, y: 1.45, w: 4.25, h: 4.9, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, showValue: true, showCatName: false, showLegend: false, showValue: true, valAxisMinVal: 0, valGridLine: { color: colors.pale, pt: 0.8 } });
}


function addEmptyCompanies(slide, modelSlide) {
  const rows = [
    [headerCell("LOGISTICS COMPANY"), headerCell("UNIT")],
    ...modelSlide.data.companies.map(([label, count]) => [label, number(count)]),
    [totalCell("TOTAL", "left"), totalCell(number(modelSlide.data.total))],
  ];
  slide.addTable(stripedRows(rows, { total: true }), tableOptions({ x: 1.15, y: 1.03, w: 11.05, h: 5.78, colW: [9.55, 1.5], rowH: fitRowHeight(rows.length, 5.78, 0.5, 0.42), fontSize: rows.length > 18 ? 7 : 9.5 }));
}


function addRejectionDetails(slide, modelSlide) {
  const rows = [
    [headerCell("LOGISTICS COMPANY"), ...modelSlide.data.headers.map(headerCell), headerCell("TOTAL\nREJECTIONS"), headerCell("TOTAL RECORDS")],
    ...modelSlide.data.rows.map((row) => row.map((value, index) => index === 0 ? String(value) : number(value))),
  ];
  const numericColumns = rows[0].length - 1;
  const numericWidth = 9.25 / numericColumns;
  slide.addTable(stripedRows(rows), tableOptions({ x: 0.38, y: 0.88, w: 12.58, h: 6.02, colW: [3.33, ...Array(numericColumns).fill(numericWidth)], rowH: fitRowHeight(rows.length, 6.02, 0.82), fontSize: rows.length > 17 ? 6.2 : 7.2, margin: 0.025 }));
}


function addScopeNotes(slide, modelSlide) {
  const rows = [
    [headerCell("ITEM"), headerCell("DETAIL")],
    ...modelSlide.data.notes.map((note, index) => [String(index + 1), note]),
  ];
  slide.addTable(stripedRows(rows), tableOptions({ x: 0.75, y: 0.95, w: 11.85, h: 5.92, colW: [1.1, 10.75], rowH: fitRowHeight(rows.length, 5.92, 0.48), fontSize: 10.5, margin: 0.1 }));
}


export function buildDeck(model) {
  if (!model || !Array.isArray(model.slides) || model.slides.length !== 13) {
    throw new Error("Sunum modeli 13 slayt içermelidir.");
  }
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SEYMEN";
  pptx.company = "Poliport";
  pptx.subject = `${model.period.label} Pregate monthly presentation`;
  pptx.title = model.slides[0].title;
  pptx.lang = "tr-TR";
  pptx.theme = { headFontFace: font, bodyFontFace: font, lang: "tr-TR" };
  model.slides.forEach((modelSlide, index) => {
    const slide = pptx.addSlide();
    if (index === 0) {
      addCover(slide, model);
      return;
    }
    addContentFrame(slide, modelSlide.title, index + 1);
    if (modelSlide.kind === "classic_vehicle_numbers") addVehicleNumbers(slide, modelSlide);
    else if (modelSlide.kind === "classic_site_distribution") addChart(slide, pptx, pptx.ChartType.doughnut, modelSlide.data.departments, { x: 2.25, y: 1.05, w: 8.8, h: 5.75, showLegend: true, legendPos: "b", legendFontSize: 9, showValue: true, showPercent: true });
    else if (modelSlide.kind === "classic_shift_table") addShiftTable(slide, modelSlide);
    else if (modelSlide.kind === "classic_year_comparison") addComparisonTable(slide, modelSlide, ["PREVIOUS YEAR", "CURRENT YEAR"]);
    else if (modelSlide.kind === "classic_rejection_comparison") addComparisonTable(slide, modelSlide, ["PREVIOUS YEAR", "CURRENT YEAR"]);
    else if (modelSlide.kind === "classic_empty_reasons") addEmptyReasons(slide, pptx, modelSlide);
    else if (modelSlide.kind === "classic_empty_companies") addEmptyCompanies(slide, modelSlide);
    else if (modelSlide.kind === "classic_logistics") addChart(slide, pptx, pptx.ChartType.bar, modelSlide.data.carriers, { x: 0.75, y: 0.95, w: 11.9, h: 5.85, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, showValue: true, showCatName: false });
    else if (modelSlide.kind === "classic_rejection_departments") addChart(slide, pptx, pptx.ChartType.bar, modelSlide.data.departments, { x: 0.75, y: 0.95, w: 11.9, h: 5.85, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, showValue: true, showCatName: false });
    else if (modelSlide.kind === "classic_rejection_details") addRejectionDetails(slide, modelSlide);
    else if (modelSlide.kind === "classic_scope_notes") addScopeNotes(slide, modelSlide);
  });
  return pptx;
}


export async function generateDeckBlob(model) {
  const output = await buildDeck(model).write({ outputType: "blob", compression: true });
  const sourceBlob = output instanceof Blob
    ? output
    : new Blob([output], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  const zip = await JSZip.loadAsync(await sourceBlob.arrayBuffer());
  const contentTypes = await zip.file("[Content_Types].xml").async("string");
  const repairedContentTypes = contentTypes.replace(
    /<Override PartName="\/([^"]+)" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.slideMaster\+xml"\/>/gu,
    (override, partName) => zip.file(partName) ? override : "",
  );
  zip.file("[Content_Types].xml", repairedContentTypes);
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

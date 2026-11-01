import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createTheme } from "./theme.mjs";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, "../..");


export function defaultReferencePath(workspaceDir = WORKSPACE) {
  return path.join(workspaceDir, "templates", "pregate-classic-template.pptx");
}


export function runtimeNodeModulesPath(environment = process.env, homeDirectory = os.homedir()) {
  const configured = environment.RUNTIME_NODE_MODULES ?? environment.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (configured) return path.resolve(configured);
  return path.join(
    homeDirectory,
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
  );
}


async function discoverPresentationSkillDir() {
  if (process.env.PREGATE_PRESENTATION_SKILL_DIR) {
    return path.resolve(process.env.PREGATE_PRESENTATION_SKILL_DIR);
  }
  const versionsRoot = path.join(
    process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
    "plugins",
    "cache",
    "openai-primary-runtime",
    "presentations",
  );
  let versions;
  try {
    versions = await fs.readdir(versionsRoot, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      "Codex presentation runtime was not found. Set PREGATE_PRESENTATION_SKILL_DIR to the installed presentations skill directory.",
      { cause: error },
    );
  }
  const candidates = versions
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  for (const version of candidates) {
    const candidate = path.join(versionsRoot, version, "skills", "presentations");
    try {
      await fs.access(path.join(candidate, "container_tools", "runtime_helpers.mjs"));
      return candidate;
    } catch {
      // Try the next installed runtime version.
    }
  }
  throw new Error(
    "Codex presentation runtime was not found. Set PREGATE_PRESENTATION_SKILL_DIR to the installed presentations skill directory.",
  );
}


export async function presentationRuntimePaths() {
  if (!process.env.RUNTIME_NODE_MODULES && !process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) {
    process.env.RUNTIME_NODE_MODULES = runtimeNodeModulesPath();
  }
  const skillDir = await discoverPresentationSkillDir();
  return {
    skillDir,
    runtimeHelpers: path.join(skillDir, "container_tools", "runtime_helpers.mjs"),
    artifactUtils: path.join(skillDir, "container_tools", "artifact_tool_utils.mjs"),
  };
}


export function createDeckSpec(model) {
  const evidence = {
    cover: [],
    vehicle_summary: ["table"],
    daily_registrations: ["chart"],
    department_distribution: ["table", "chart"],
    vehicle_type_distribution: ["chart"],
    carrier_distribution: ["table"],
    ravago_alisan_distribution: ["table", "chart"],
    registration_status: ["table", "chart"],
    scope_notes: ["table"],
    classic_vehicle_numbers: ["table"],
    classic_site_distribution: ["chart"],
    classic_shift_table: ["table"],
    classic_year_comparison: ["table"],
    classic_rejection_comparison: ["table"],
    classic_empty_reasons: ["table", "chart"],
    classic_empty_companies: ["table"],
    classic_logistics: ["chart"],
    classic_rejection_departments: ["chart"],
    classic_rejection_details: ["table"],
    classic_scope_notes: ["table"],
    classic_closing: [],
  };
  return model.slides.map((slide, index) => ({
    number: index + 1,
    title: slide.title,
    kind: slide.kind,
    usesPhoto: false,
    usesClassicTemplate: true,
    nativeObjects: evidence[slide.kind] ?? [],
  }));
}


export function resolveTemplateSlideIndexes(slideCount) {
  if (slideCount === 3) return { cover: 0, content: 1, closing: 2 };
  if (slideCount >= 16) return { cover: 0, content: 15, closing: 14 };
  throw new Error("Reference must be the bundled three-slide template or the original reference presentation.");
}


export function deleteIfPresent(presentation, elementId) {
  try {
    presentation.delete(elementId);
    return true;
  } catch (error) {
    if (String(error?.message ?? error).includes("Unknown element ID")) return false;
    throw error;
  }
}


export function elementIdsWithExactText(ndjson, expectedText) {
  const ids = [];
  for (const line of String(ndjson ?? "").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (item?.text === expectedText && typeof item.id === "string") ids.push(item.id);
    } catch {
      // Ignore non-record diagnostic lines from the inspector.
    }
  }
  return ids;
}


export async function deleteElementsWithExactText(presentation, expectedText) {
  const inspection = await presentation.inspect({ kind: "textbox", max_chars: 200000 });
  const ids = elementIdsWithExactText(inspection.ndjson, expectedText);
  for (const id of ids) deleteIfPresent(presentation, id);
  return ids;
}


export function ptToPx(points) {
  return points * 96 / 72;
}


export function classicRowFills(count) {
  return Array.from({ length: count }, (_, index) => (index % 2 === 0 ? "#FFFFFF" : "#F2F2F2"));
}


export function classicPieLabelLayout(rows) {
  const total = rows.reduce((sum, row) => sum + Number(row[1] || 0), 0);
  const leftAnchorY = [510, 456, 406, 358, 312];
  const rightAnchorY = [226, 492];

  return rows.map(([name, rawValue], index) => {
    const value = Number(rawValue || 0);
    const side = index < 2 ? "right" : "left";
    const localIndex = side === "right" ? index : index - 2;
    const anchor = side === "right"
      ? { x: 824, y: rightAnchorY[localIndex] }
      : { x: 430, y: leftAnchorY[localIndex] };
    const label = side === "right"
      ? { left: 950, top: anchor.y - 29, width: 270, height: 58 }
      : { left: 64, top: anchor.y - 29, width: 250, height: 58 };
    return {
      name,
      value,
      percent: total > 0 ? Math.round(value / total * 100) : 0,
      side,
      label,
      anchor,
      attachment: {
        x: side === "right" ? label.left - 10 : label.left + label.width + 10,
        y: label.top + label.height / 2,
      },
    };
  });
}


export function presentationPaths(model, workspaceDir = WORKSPACE) {
  const filename = model?.output_filename;
  if (
    typeof filename !== "string"
    || path.basename(filename) !== filename
    || !filename.toLocaleUpperCase("tr-TR").endsWith(" PREGATE SUNUM.PPTX")
  ) {
    throw new Error("Model geçerli bir dönem tabanlı output_filename alanı içermelidir");
  }
  const receiptName = `${filename.slice(0, -5)}.validation.json`;
  return {
    candidatePath: path.join(workspaceDir, "work", filename),
    finalPath: path.join(workspaceDir, "outputs", filename),
    receiptPath: path.join(workspaceDir, "work", ".codex-finalizer", receiptName),
  };
}


function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) continue;
    values[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  if (!values.data) throw new Error("--data zorunludur");
  return values;
}


function slidesFromPresentation(presentation) {
  if (Array.isArray(presentation.slides?.items)) return presentation.slides.items;
  if (Number.isInteger(presentation.slides?.count) && typeof presentation.slides.getItem === "function") {
    return Array.from({ length: presentation.slides.count }, (_, index) => presentation.slides.getItem(index));
  }
  throw new Error("Imported presentation slides could not be enumerated.");
}


function number(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value ?? 0);
}


function percent(value) {
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value ?? 0)}%`;
}


function shortLabel(value, limit = 35) {
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit - 1).trimEnd()}…`;
}


function addText(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = String(text);
  const { fontSizePt = 13, ...rest } = style;
  shape.text.style = {
    typeface: "Calibri",
    fontSize: ptToPx(fontSizePt),
    color: "#000000",
    ...rest,
  };
  return shape;
}


function addLine(slide, from, to, color = "#7F7F7F", width = 1.25) {
  return slide.shapes.add({
    geometry: "line",
    position: {
      left: Math.min(from.x, to.x),
      top: Math.min(from.y, to.y),
      width: Math.abs(to.x - from.x),
      height: Math.abs(to.y - from.y),
    },
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}


function addTitle(slide, modelSlide, theme) {
  addText(
    slide,
    modelSlide.title,
    { left: 225, top: 15, width: 835, height: 48 },
    {
      fontSizePt: theme.typography.slideTitlePt,
      bold: true,
      color: theme.colors.navy,
      alignment: "center",
      autoFit: "shrinkText",
    },
  );
  slide.speakerNotes.text = `Source: ${modelSlide.source}`;
}


function styleTable(table, values, theme, options = {}) {
  const {
    headerFill = theme.colors.header,
    totalRow = null,
    bodyFontPt = 12,
    leftAlignColumns = [0],
    rowHeights = null,
  } = options;
  const rows = values.length;
  const columns = values[0].length;
  table.borders.assign({ style: "solid", fill: "#A6A6A6", width: 1 });
  const bodyFills = classicRowFills(Math.max(0, rows - 1));
  for (let row = 0; row < rows; row += 1) {
    table.rows[row].height = rowHeights?.[row] ?? (row === 0 ? 38 : 36);
    for (let column = 0; column < columns; column += 1) {
      const cell = table.getCell(row, column);
      cell.fill = row === 0 ? headerFill : bodyFills[row - 1];
      cell.text.style = {
        typeface: "Calibri",
        fontSize: ptToPx(row === 0 ? 12 : bodyFontPt),
        bold: row === 0 || row === totalRow,
        color: row === 0 ? theme.colors.white : row === totalRow ? theme.colors.total : theme.colors.text,
        alignment: leftAlignColumns.includes(column) ? "left" : "center",
        autoFit: "shrinkText",
      };
    }
  }
}


function addClassicTable(slide, values, position, columnWidths, theme, options = {}) {
  const table = slide.tables.add({
    rows: values.length,
    columns: values[0].length,
    ...position,
    columnWidths,
    values,
  });
  styleTable(table, values, theme, options);
  return table;
}


function chartBase(theme) {
  const fontSize = ptToPx(theme.typography.chartLabelPt);
  return {
    hasLegend: false,
    chartFill: "none",
    chartLine: { style: "solid", fill: "none", width: 0 },
    plotAreaFill: "none",
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
    xAxis: {
      textStyle: { fontSize, fill: theme.colors.text },
      line: { style: "solid", fill: "#A6A6A6", width: 1 },
    },
    yAxis: {
      textStyle: { fontSize, fill: theme.colors.text },
      line: { style: "solid", fill: "#A6A6A6", width: 1 },
      majorGridlines: { style: "solid", fill: theme.colors.line, width: 1 },
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fontSize, fill: theme.colors.text, bold: true },
    },
  };
}


function styleChart(chart, applyPresentationChartFont) {
  applyPresentationChartFont(chart, { fontFamily: "Calibri" });
  return chart;
}


function aggregateOther(rows, limit) {
  const visible = rows.slice(0, limit);
  const other = rows.slice(limit).reduce((sum, row) => sum + Number(row[1] || 0), 0);
  return other > 0 ? [...visible, ["Other", other]] : visible;
}


function addSummarySlide(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const values = [
    ["METRIC", "VALUE"],
    ["Reporting Period", data.period_range],
    ["Total Vehicle Registrations", number(data.total_records)],
    ["Active Reporting Days", number(data.active_days)],
    ["Average per Active Day", number(data.average_per_active_day)],
    ["Completed Records", number(data.completed_records)],
    ["Completion Rate", percent(data.completion_rate)],
  ];
  addClassicTable(
    slide,
    values,
    { left: 176, top: 118, width: 928, height: 450 },
    [570, 358],
    theme,
    { bodyFontPt: 15, rowHeights: [44, 54, 54, 54, 54, 54, 54] },
  );
}


function addDailySlide(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const rows = modelSlide.data.daily_counts;
  const labels = rows.map(([iso]) => {
    const date = new Date(`${iso}T00:00:00Z`);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  });
  const chart = slide.charts.add("bar", {
    ...chartBase(theme),
    position: { left: 80, top: 112, width: 1120, height: 500 },
    categories: labels,
    series: [{ name: "Vehicles", values: rows.map((row) => row[1]), fill: theme.colors.primary }],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 42 },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fontSize: ptToPx(10), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
}


function addDepartmentSlide(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const rows = modelSlide.data.departments;
  const total = modelSlide.data.total;
  const values = [
    ["DEPARTMENT", "VEHICLES", "SHARE"],
    ...rows.map(([label, count]) => [label, number(count), percent(count / total * 100)]),
    ["TOTAL", number(total), "100.0%"],
  ];
  addClassicTable(
    slide,
    values,
    { left: 50, top: 125, width: 675, height: 340 },
    [405, 135, 135],
    theme,
    { bodyFontPt: 12.5, totalRow: values.length - 1, rowHeights: [42, 50, 50, 50, 50] },
  );
  const chart = slide.charts.add("doughnut", {
    ...chartBase(theme),
    position: { left: 745, top: 105, width: 465, height: 455 },
    categories: rows.map((row) => row[0]),
    series: [{
      name: "Vehicles",
      values: rows.map((row) => row[1]),
      points: [
        { idx: 0, fill: theme.colors.primary },
        { idx: 1, fill: theme.colors.header },
        { idx: 2, fill: theme.colors.accent },
      ],
    }],
    hasLegend: true,
    legend: { position: "bottom", textStyle: { fontSize: ptToPx(10), fill: theme.colors.text } },
    doughnutOptions: { holeSize: 58, firstSliceAngle: 270 },
    dataLabels: {
      showValue: true,
      showPercent: true,
      position: "dataCallout",
      textStyle: { fontSize: ptToPx(10), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
}


function addVehicleTypeSlide(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const rows = aggregateOther(modelSlide.data.vehicle_types, 8);
  const chart = slide.charts.add("bar", {
    ...chartBase(theme),
    position: { left: 80, top: 105, width: 1120, height: 520 },
    categories: rows.map((row) => shortLabel(row[0], 30)),
    series: [{ name: "Vehicles", values: rows.map((row) => row[1]), fill: theme.colors.header }],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 35 },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fontSize: ptToPx(10), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
}


function addCarrierSlide(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const rows = modelSlide.data.carriers;
  const visibleTotal = rows.reduce((sum, row) => sum + row[1], 0);
  const values = [
    ["LOGISTICS COMPANY", "VEHICLES", "SHARE OF ALL RECORDS"],
    ...rows.map(([label, count]) => [shortLabel(label, 48), number(count), percent(count / modelSlide.data.total * 100)]),
    ["TOP 10 TOTAL", number(visibleTotal), percent(visibleTotal / modelSlide.data.total * 100)],
  ];
  addClassicTable(
    slide,
    values,
    { left: 95, top: 92, width: 1090, height: 550 },
    [650, 190, 250],
    theme,
    { bodyFontPt: 11.5, totalRow: values.length - 1, rowHeights: [38, ...Array(10).fill(40), 42] },
  );
}


function addSplitSlide(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const total = data.ravago + data.alisan;
  const values = [
    ["GROUP", "VEHICLES", "SHARE"],
    ["Ravago", number(data.ravago), percent(data.ravago / total * 100)],
    ["Alişan", number(data.alisan), percent(data.alisan / total * 100)],
    ["TOTAL", number(total), "100.0%"],
  ];
  addClassicTable(
    slide,
    values,
    { left: 70, top: 150, width: 570, height: 300 },
    [290, 140, 140],
    theme,
    { bodyFontPt: 14, totalRow: 3, rowHeights: [46, 60, 60, 60] },
  );
  const chart = slide.charts.add("doughnut", {
    ...chartBase(theme),
    position: { left: 680, top: 105, width: 500, height: 455 },
    categories: ["Ravago", "Alişan"],
    series: [{
      name: "Vehicles",
      values: [data.ravago, data.alisan],
      points: [{ idx: 0, fill: theme.colors.primary }, { idx: 1, fill: theme.colors.header }],
    }],
    hasLegend: true,
    legend: { position: "bottom", textStyle: { fontSize: ptToPx(11), fill: theme.colors.text } },
    doughnutOptions: { holeSize: 58, firstSliceAngle: 270 },
    dataLabels: {
      showValue: true,
      showPercent: true,
      position: "dataCallout",
      textStyle: { fontSize: ptToPx(11), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
}


function addStatusSlide(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const total = data.completed + data.other;
  const values = [
    ["STATUS", "RECORDS", "SHARE"],
    ["Completed", number(data.completed), percent(data.completed / total * 100)],
    ["Other Statuses", number(data.other), percent(data.other / total * 100)],
    ["TOTAL", number(total), "100.0%"],
  ];
  addClassicTable(
    slide,
    values,
    { left: 70, top: 150, width: 570, height: 300 },
    [290, 140, 140],
    theme,
    { bodyFontPt: 14, totalRow: 3, rowHeights: [46, 60, 60, 60] },
  );
  const chart = slide.charts.add("doughnut", {
    ...chartBase(theme),
    position: { left: 680, top: 105, width: 500, height: 455 },
    categories: ["Completed", "Other Statuses"],
    series: [{
      name: "Records",
      values: [data.completed, data.other],
      points: [{ idx: 0, fill: theme.colors.primary }, { idx: 1, fill: theme.colors.accent }],
    }],
    hasLegend: true,
    legend: { position: "bottom", textStyle: { fontSize: ptToPx(11), fill: theme.colors.text } },
    doughnutOptions: { holeSize: 58, firstSliceAngle: 270 },
    dataLabels: {
      showValue: true,
      showPercent: true,
      position: "dataCallout",
      textStyle: { fontSize: ptToPx(11), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
}


function addScopeSlide(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const values = [
    ["ITEM", "DETAIL"],
    ["Reporting Period", data.period_range],
    ["Record Count", number(data.record_count)],
    ["Data Source", data.notes[0]],
    ["Coverage", data.notes[1]],
    ["Privacy", data.notes[2]],
  ];
  addClassicTable(
    slide,
    values,
    { left: 85, top: 112, width: 1110, height: 490 },
    [260, 850],
    theme,
    {
      bodyFontPt: 13,
      leftAlignColumns: [0, 1],
      rowHeights: [42, 58, 58, 82, 82, 82],
    },
  );
}


function addClassicVehicleNumbers(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const values = [
    ["DEPARTMENT", "APPROVED", "REJECTED", "TOTAL"],
    ...data.departments.map(([name, approved, rejected, total]) => [
      shortLabel(name, 54),
      number(approved),
      number(rejected),
      number(total),
    ]),
    ["TOTAL", number(data.approved), number(data.rejected), number(data.total)],
  ];
  addClassicTable(
    slide,
    values,
    { left: 68, top: 84, width: 1144, height: 555 },
    [580, 188, 188, 188],
    theme,
    {
      bodyFontPt: 9.5,
      totalRow: values.length - 1,
      rowHeights: [34, ...Array(values.length - 2).fill(34), 36],
    },
  );
}


function addClassicSiteDistribution(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const rows = aggregateOther(modelSlide.data.departments, 6);
  const palette = ["#5B9BD5", "#ED7D31", "#A5A5A5", "#FFC000", "#4472C4", "#70AD47", "#9E480E"];
  const chart = slide.charts.add("doughnut", {
    ...chartBase(theme),
    position: { left: 330, top: 105, width: 620, height: 520 },
    categories: rows.map((row) => shortLabel(row[0], 32)),
    series: [{
      name: "Vehicles",
      values: rows.map((row) => row[1]),
      points: rows.map((_row, index) => ({ idx: index, fill: palette[index % palette.length] })),
    }],
    hasLegend: false,
    doughnutOptions: { holeSize: 35, firstSliceAngle: 270 },
    dataLabels: {
      showCategoryName: false,
      showPercent: false,
      showValue: false,
    },
  });
  styleChart(chart, applyPresentationChartFont);

  const labels = classicPieLabelLayout(rows);
  labels.forEach((label, index) => {
    const color = palette[index % palette.length];
    addLine(slide, label.anchor, label.attachment, "#8C8C8C", 1.1);
    slide.shapes.add({
      geometry: "rect",
      position: {
        left: label.label.left,
        top: label.label.top + 18,
        width: 12,
        height: 12,
      },
      fill: color,
      line: { style: "solid", fill: color, width: 0.5 },
    });
    addText(
      slide,
      `${label.name}\n${label.percent}%`,
      {
        left: label.label.left + 20,
        top: label.label.top,
        width: label.label.width - 20,
        height: label.label.height,
      },
      {
        fontSizePt: 10.5,
        bold: true,
        color: theme.colors.text,
        alignment: label.side === "right" ? "left" : "right",
        autoFit: "shrinkText",
      },
    );
  });
}


function addClassicShiftTable(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const monthLabels = data.months.map((month) => String(month).slice(0, 3).toUpperCase());
  const values = [
    ["SHIFT", "DEPARTMENT", ...monthLabels, "2026 TOTAL"],
    ...data.rows.map(([shift, department, monthlyValues, rowTotal]) => [
      shift,
      shortLabel(department, 28),
      ...monthlyValues.map(number),
      number(rowTotal),
    ]),
    [
      "TOTAL",
      "",
      ...data.monthly_totals.map((row) => number(row[1])),
      number(data.monthly_totals.reduce((sum, row) => sum + row[1], 0)),
    ],
  ];
  addClassicTable(
    slide,
    values,
    { left: 36, top: 100, width: 1208, height: 500 },
    [72, 184, ...Array(data.months.length).fill(78), 92],
    theme,
    {
      bodyFontPt: 8.2,
      totalRow: values.length - 1,
      rowHeights: [38, ...Array(values.length - 2).fill(44), 42],
    },
  );
}


function addClassicYearComparison(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const values = [
    ["DEPARTMENT", "2025 SAME PERIOD", "2026 CURRENT PERIOD"],
    ...data.departments.map(([name, previous, current]) => [shortLabel(name, 52), number(previous), number(current)]),
    ["TOTAL", number(data.previous_total), number(data.current_total)],
  ];
  addClassicTable(
    slide,
    values,
    { left: 130, top: 84, width: 1020, height: 560 },
    [570, 225, 225],
    theme,
    {
      bodyFontPt: 9,
      totalRow: values.length - 1,
      rowHeights: [34, ...Array(values.length - 2).fill(31), 35],
    },
  );
}


function addClassicRejectionComparison(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const values = [
    ["DEPARTMENT", "2025 SAME PERIOD", "2026 CURRENT PERIOD"],
    ...data.departments.map(([name, previous, current]) => [shortLabel(name, 52), number(previous), number(current)]),
    ["TOTAL", number(data.previous_total), number(data.current_total)],
  ];
  addClassicTable(
    slide,
    values,
    { left: 130, top: 84, width: 1020, height: 560 },
    [570, 225, 225],
    theme,
    {
      bodyFontPt: 9,
      totalRow: values.length - 1,
      rowHeights: [34, ...Array(values.length - 2).fill(31), 35],
    },
  );
}


function addClassicEmptyReasons(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const values = [
    ["REASON", "UNIT"],
    ...data.reasons.map(([label, count]) => [shortLabel(label, 55), number(count)]),
    ["TOTAL", number(data.total)],
  ];
  addClassicTable(
    slide,
    values,
    { left: 42, top: 92, width: 720, height: 540 },
    [610, 110],
    theme,
    {
      bodyFontPt: 8.8,
      totalRow: values.length - 1,
      rowHeights: [34, ...Array(values.length - 2).fill(33), 36],
    },
  );
  const chartRows = data.reasons.slice(0, 5);
  const chart = slide.charts.add("bar", {
    ...chartBase(theme),
    position: { left: 790, top: 155, width: 430, height: 385 },
    categories: chartRows.map((row) => shortLabel(row[0], 24)),
    series: [{ name: "Unit", values: chartRows.map((row) => row[1]), fill: theme.colors.primary }],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 45 },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fontSize: ptToPx(9), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
}


function addClassicEmptyCompanies(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const values = [
    ["COMPANY", "UNIT"],
    ...data.companies.map(([label, count]) => [shortLabel(label, 60), number(count)]),
    ["TOTAL", number(data.total)],
  ];
  addClassicTable(
    slide,
    values,
    { left: 210, top: 82, width: 860, height: 565 },
    [700, 160],
    theme,
    {
      bodyFontPt: 8.8,
      totalRow: values.length - 1,
      rowHeights: [32, ...Array(values.length - 2).fill(30), 34],
    },
  );
}


function addClassicLogistics(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const rows = data.carriers;
  const chart = slide.charts.add("bar", {
    ...chartBase(theme),
    position: { left: 140, top: 90, width: 1040, height: 500 },
    categories: rows.map((row) => shortLabel(row[0], 42)),
    series: [{ name: "Vehicles", values: rows.map((row) => row[1]), fill: theme.colors.header }],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 30 },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fontSize: ptToPx(10), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
  addText(
    slide,
    `Ravago is separated from Alişan: ${number(data.alisan_original)} − ${number(data.ravago)} = ${number(data.alisan_adjusted)} vehicles.`,
    { left: 250, top: 605, width: 780, height: 28 },
    { fontSizePt: 11, color: theme.colors.navy, bold: true, alignment: "center" },
  );
}


function addClassicRejectionDepartments(slide, modelSlide, theme, applyPresentationChartFont) {
  addTitle(slide, modelSlide, theme);
  const rows = modelSlide.data.departments;
  const chart = slide.charts.add("bar", {
    ...chartBase(theme),
    position: { left: 105, top: 90, width: 1080, height: 520 },
    categories: rows.map((row) => shortLabel(row[0], 42)),
    series: [{ name: "Rejections", values: rows.map((row) => row[1]), fill: theme.colors.total }],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 32 },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fontSize: ptToPx(10), fill: theme.colors.text, bold: true },
    },
  });
  styleChart(chart, applyPresentationChartFont);
}


function addClassicRejectionDetails(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const data = modelSlide.data;
  const header = ["LOGISTICS COMPANY", ...data.headers, "TOTAL REJECTIONS", "TOTAL RECORDS"];
  const emptyRow = ["NO ADDITIONAL RECORDS", ...Array(data.headers.length + 2).fill("")];
  const rows = data.rows.length > 0 ? data.rows : [emptyRow];
  const values = [
    header,
    ...rows.map((row) => [shortLabel(row[0], 42), ...row.slice(1).map(number)]),
  ];
  addClassicTable(
    slide,
    values,
    { left: 36, top: 83, width: 1208, height: 552 },
    [330, ...Array(data.headers.length).fill(110), 164, 164],
    theme,
    {
      bodyFontPt: 7.2,
      rowHeights: [34, ...Array(values.length - 1).fill(25)],
    },
  );
}


function addClassicScopeNotes(slide, modelSlide, theme) {
  addTitle(slide, modelSlide, theme);
  const notes = modelSlide.data.notes;
  const values = [
    ["ITEM", "DETAIL"],
    ...notes.map((note, index) => [`${index + 1}`, note]),
  ];
  addClassicTable(
    slide,
    values,
    { left: 72, top: 90, width: 1136, height: 540 },
    [105, 1031],
    theme,
    {
      bodyFontPt: 11.5,
      leftAlignColumns: [0, 1],
      rowHeights: [38, ...Array(notes.length).fill(Math.max(48, Math.floor(500 / Math.max(1, notes.length))))],
    },
  );
}


async function buildTemplateFrame(referencePath, model) {
  const { runtimeHelpers, artifactUtils } = await presentationRuntimePaths();
  const [{ importRuntimeModule }, { applyPresentationChartFont }] = await Promise.all([
    import(pathToFileURL(runtimeHelpers).href),
    import(pathToFileURL(artifactUtils).href),
  ]);
  const { FileBlob, PresentationFile } = await importRuntimeModule("@oai/artifact-tool");
  const presentation = await PresentationFile.importPptx(await FileBlob.load(referencePath));
  await deleteElementsWithExactText(presentation, "BACK UP");
  const originals = [...slidesFromPresentation(presentation)];
  const templateSlides = resolveTemplateSlideIndexes(originals.length);

  const coverTitle = presentation.resolve("sh/7qp4be9c");
  coverTitle.text = model.slides[0].title;
  deleteIfPresent(presentation, "sh/9kby1g7m");
  if (model.slides.some((slide) => slide.kind === "classic_closing")) {
    const closingTitle = presentation.resolve("sh/k3y5ov21");
    closingTitle.text = "THANK YOU";
  }

  const outputSlides = [originals[0].duplicate()];
  for (let index = 1; index < model.slides.length; index += 1) {
    outputSlides.push(
      model.slides[index].kind === "classic_closing"
        ? originals[templateSlides.closing].duplicate()
        : originals[templateSlides.content].duplicate(),
    );
  }
  for (const slide of originals) slide.delete();
  outputSlides.forEach((slide, index) => slide.moveTo(index));

  return { presentation, slides: outputSlides, applyPresentationChartFont };
}


export async function buildDeck(model, { referencePath = defaultReferencePath() } = {}) {
  const theme = createTheme();
  const { presentation, slides, applyPresentationChartFont } = await buildTemplateFrame(referencePath, model);

  if (model.slides[0].data.period_range) {
    addText(
      slides[0],
      model.slides[0].data.period_range,
      { left: 866, top: 535, width: 345, height: 28 },
      { fontSizePt: 12, color: theme.colors.navy, alignment: "left" },
    );
  }
  slides[0].speakerNotes.text = `Source: ${model.slides[0].source}`;

  for (let index = 1; index < model.slides.length; index += 1) {
    const slide = slides[index];
    const modelSlide = model.slides[index];
    slide.background.fill = theme.colors.background;
    switch (modelSlide.kind) {
      case "vehicle_summary":
        addSummarySlide(slide, modelSlide, theme);
        break;
      case "daily_registrations":
        addDailySlide(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "department_distribution":
        addDepartmentSlide(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "vehicle_type_distribution":
        addVehicleTypeSlide(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "carrier_distribution":
        addCarrierSlide(slide, modelSlide, theme);
        break;
      case "ravago_alisan_distribution":
        addSplitSlide(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "registration_status":
        addStatusSlide(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "scope_notes":
        addScopeSlide(slide, modelSlide, theme);
        break;
      case "classic_vehicle_numbers":
        addClassicVehicleNumbers(slide, modelSlide, theme);
        break;
      case "classic_site_distribution":
        addClassicSiteDistribution(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "classic_shift_table":
        addClassicShiftTable(slide, modelSlide, theme);
        break;
      case "classic_year_comparison":
        addClassicYearComparison(slide, modelSlide, theme);
        break;
      case "classic_rejection_comparison":
        addClassicRejectionComparison(slide, modelSlide, theme);
        break;
      case "classic_empty_reasons":
        addClassicEmptyReasons(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "classic_empty_companies":
        addClassicEmptyCompanies(slide, modelSlide, theme);
        break;
      case "classic_logistics":
        addClassicLogistics(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "classic_rejection_departments":
        addClassicRejectionDepartments(slide, modelSlide, theme, applyPresentationChartFont);
        break;
      case "classic_rejection_details":
        addClassicRejectionDetails(slide, modelSlide, theme);
        break;
      case "classic_scope_notes":
        addClassicScopeNotes(slide, modelSlide, theme);
        break;
      case "classic_closing":
        slide.speakerNotes.text = `Source: ${modelSlide.source}`;
        break;
      default:
        throw new Error(`Unsupported slide kind: ${modelSlide.kind}`);
    }
  }
  return presentation;
}


async function main() {
  const args = parseArgs(process.argv.slice(2));
  const model = JSON.parse(await fs.readFile(path.resolve(args.data), "utf8"));
  const presentation = await buildDeck(model, {
    referencePath: args.reference ? path.resolve(args.reference) : defaultReferencePath(),
  });
  const { runtimeHelpers } = await presentationRuntimePaths();
  const { importRuntimeModule } = await import(pathToFileURL(runtimeHelpers).href);
  const { PresentationFile } = await importRuntimeModule("@oai/artifact-tool");
  const output = args.output ? path.resolve(args.output) : presentationPaths(model, WORKSPACE).candidatePath;
  await fs.mkdir(path.dirname(output), { recursive: true });
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(output);
  process.stdout.write(`${output}\n`);
}


if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

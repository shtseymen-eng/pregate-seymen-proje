export const DECK_THEME = {
  font: "Calibri",
  colors: {
    navy: "002060",
    blue: "4472C4",
    sky: "5B9BD5",
    pale: "D9EAF7",
    white: "FFFFFF",
    row: "F2F2F2",
    line: "B7B7B7",
    text: "1F1F1F",
    muted: "666666",
    red: "FF0000",
  },
};


export function fitRowHeight(rowCount, totalHeight, headerHeight = 0.48, footerHeight = 0) {
  const bodyRows = Math.max(0, rowCount - 1 - (footerHeight ? 1 : 0));
  const bodyHeight = bodyRows ? Math.max(0.18, (totalHeight - headerHeight - footerHeight) / bodyRows) : 0;
  return [headerHeight, ...Array(bodyRows).fill(bodyHeight), ...(footerHeight ? [footerHeight] : [])];
}


export function number(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

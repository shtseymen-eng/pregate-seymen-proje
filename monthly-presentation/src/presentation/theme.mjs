export function createTheme() {
  return {
    slideSize: { width: 1280, height: 720 },
    fontFamily: "Calibri",
    colors: {
      primary: "#4472C4",
      header: "#5B9BD5",
      navy: "#002060",
      background: "#FFFFFF",
      white: "#FFFFFF",
      rowGray: "#F2F2F2",
      line: "#D9E1F2",
      text: "#000000",
      muted: "#595959",
      accent: "#9DC3E6",
      total: "#FF0000",
    },
    typography: {
      coverTitlePt: 24,
      slideTitlePt: 22,
      bodyPt: 13,
      chartLabelPt: 10,
      footnotePt: 8,
    },
    layout: {
      marginX: 50,
      marginTop: 14,
      contentTop: 78,
      footerTop: 680,
      contentWidth: 1180,
      contentHeight: 580,
      gap: 16,
    },
  };
}

import assert from "node:assert/strict";
import test from "node:test";

import { createTheme } from "../src/presentation/theme.mjs";


test("theme uses the approved Poliport-inspired design system", () => {
  const theme = createTheme();

  assert.deepEqual(theme.slideSize, { width: 1280, height: 720 });
  assert.equal(theme.fontFamily, "Calibri");
  assert.equal(theme.colors.primary, "#4472C4");
  assert.equal(theme.colors.header, "#5B9BD5");
  assert.equal(theme.colors.background, "#FFFFFF");
  assert.equal(theme.colors.total, "#FF0000");
  assert.ok(theme.typography.slideTitlePt >= 20);
  assert.ok(theme.typography.bodyPt >= 12);
  assert.ok(theme.typography.chartLabelPt >= 10);
});

test("red is isolated as the total-row semantic color", () => {
  const theme = createTheme();
  const nonTotal = Object.entries(theme.colors).filter(([name]) => name !== "total");

  for (const [, value] of nonTotal) {
    assert.notEqual(value, theme.colors.total);
  }
});

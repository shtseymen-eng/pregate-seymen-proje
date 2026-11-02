import assert from "node:assert/strict";
import test from "node:test";

import { pregateWorkbookBytes, vehicleWorkbookBytes } from "./workbook-fixtures.mjs";


async function appModule() {
  try {
    return await import("../src/app.js");
  } catch {
    return {};
  }
}


function workbookFile(name, bytes) {
  return {
    name,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}


test("create action is enabled only when both xlsx roles are ready", async () => {
  const { canCreatePresentation } = await appModule();
  assert.equal(typeof canCreatePresentation, "function");
  const pregate = workbookFile("Pregate.xlsx", pregateWorkbookBytes());
  const vehicles = workbookFile("Arac.xlsx", vehicleWorkbookBytes({ month: 10 }));

  assert.equal(canCreatePresentation(null, null), false);
  assert.equal(canCreatePresentation(pregate, null), false);
  assert.equal(canCreatePresentation(pregate, { ...vehicles, name: "Arac.csv" }), false);
  assert.equal(canCreatePresentation(pregate, vehicles), true);
});


test("invalid workbook selections expose a role-specific xlsx message", async () => {
  const { describeWorkbookSelection } = await import("../src/ui.js");
  assert.equal(typeof describeWorkbookSelection, "function");
  assert.deepEqual(
    describeWorkbookSelection({ name: "Pregate.csv" }, "Pregate sunum Excel'i"),
    {
      ready: false,
      label: "Pregate.csv — Pregate sunum Excel'i için yalnızca .xlsx dosyası seçin.",
    },
  );
});


test("presentation creation reports the Turkish progress sequence and retains the result", async () => {
  const { createPresentationFromFiles, downloadLastDeck } = await appModule();
  assert.equal(typeof createPresentationFromFiles, "function");
  assert.equal(typeof downloadLastDeck, "function");
  const progress = [];
  const result = await createPresentationFromFiles(
    workbookFile("Pregate.xlsx", pregateWorkbookBytes()),
    workbookFile("Arac.xlsx", vehicleWorkbookBytes({ month: 10 })),
    { onProgress: (message) => progress.push(message) },
  );

  assert.deepEqual(progress, ["Dosyalar okunuyor", "Veriler doğrulanıyor", "Sunum hazırlanıyor", "İndirme hazır"]);
  assert.equal(result.filename, "EKİM 2026 PREGATE SUNUM.pptx");
  assert.equal(result.model.summary.total, 100);
  assert.ok(result.blob.size > 20_000);

  let repeated = null;
  downloadLastDeck((blob, filename) => { repeated = { blob, filename }; });
  assert.equal(repeated.blob, result.blob);
  assert.equal(repeated.filename, result.filename);
});


test("period mismatch becomes a friendly Turkish error and keeps the selected files reusable", async () => {
  const { createPresentationFromFiles } = await appModule();
  assert.equal(typeof createPresentationFromFiles, "function");
  let reportedError = "";
  await assert.rejects(
    createPresentationFromFiles(
      workbookFile("Pregate.xlsx", pregateWorkbookBytes()),
      workbookFile("Arac.xlsx", vehicleWorkbookBytes({ month: 9 })),
      { onError: (message) => { reportedError = message; } },
    ),
    /Sunum oluşturulamadı.*Pregate 2026-10.*araç kayıt 2026-09/u,
  );
  assert.match(reportedError, /Pregate 2026-10.*araç kayıt 2026-09/u);
});

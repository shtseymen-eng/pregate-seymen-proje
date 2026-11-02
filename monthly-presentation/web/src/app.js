import { generateDeckBlob } from "./deck.js";
import { parsePregateWorkbook, parseVehicleWorkbook } from "./extract.js";
import { buildPresentationModel } from "./model.js";
import { assertLocalWorkbookFile, readWorkbookBytes } from "./privacy.js";


let lastDeck = null;


export function canCreatePresentation(pregateFile, vehicleFile) {
  return Boolean(
    pregateFile?.name?.toLocaleLowerCase("tr-TR").endsWith(".xlsx")
    && vehicleFile?.name?.toLocaleLowerCase("tr-TR").endsWith(".xlsx"),
  );
}


function report(callbacks, name, value) {
  const callback = callbacks?.[name];
  if (typeof callback === "function") callback(value);
}


export async function createPresentationFromFiles(pregateFile, vehicleFile, callbacks = {}) {
  try {
    assertLocalWorkbookFile(pregateFile, "Pregate sunum Excel'i");
    assertLocalWorkbookFile(vehicleFile, "Araç kayıt sorgusu Excel'i");
    report(callbacks, "onProgress", "Dosyalar okunuyor");
    const [pregateBytes, vehicleBytes] = await Promise.all([
      readWorkbookBytes(pregateFile),
      readWorkbookBytes(vehicleFile),
    ]);

    report(callbacks, "onProgress", "Veriler doğrulanıyor");
    const reportData = parsePregateWorkbook(pregateBytes);
    const vehicleSplit = parseVehicleWorkbook(vehicleBytes);
    const model = buildPresentationModel(reportData, vehicleSplit);

    report(callbacks, "onProgress", "Sunum hazırlanıyor");
    const blob = await generateDeckBlob(model);
    lastDeck = { blob, filename: model.outputFilename, model };
    report(callbacks, "onProgress", "İndirme hazır");
    report(callbacks, "onSuccess", lastDeck);
    return lastDeck;
  } catch (error) {
    const message = `Sunum oluşturulamadı: ${error instanceof Error ? error.message : String(error)}`;
    report(callbacks, "onError", message);
    throw new Error(message, { cause: error });
  }
}


export function browserDownload(blob, filename) {
  if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") {
    throw new Error("Tarayıcı indirme özelliği kullanılamıyor.");
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}


export function downloadLastDeck(save = browserDownload) {
  if (!lastDeck) throw new Error("Henüz indirilecek bir sunum oluşturulmadı.");
  save(lastDeck.blob, lastDeck.filename);
  return lastDeck;
}


if (typeof document !== "undefined") {
  import("./ui.js").then(({ mountPresentationApp }) => mountPresentationApp(document));
}

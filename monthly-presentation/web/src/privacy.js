export function assertLocalWorkbookFile(file, role) {
  if (!file) {
    throw new Error(`${role} dosyası seçilmedi.`);
  }
  if (typeof file.name !== "string" || !file.name.toLocaleLowerCase("tr-TR").endsWith(".xlsx")) {
    throw new Error(`${role} dosyası .xlsx uzantılı olmalıdır.`);
  }
  return file;
}


export async function readWorkbookBytes(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Seçilen Excel dosyası tarayıcı tarafından okunamadı.");
  }
  return new Uint8Array(await file.arrayBuffer());
}

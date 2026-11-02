const TURKISH_ASCII = {
  İ: "I", I: "I", ı: "I",
  Ş: "S", ş: "S",
  Ğ: "G", ğ: "G",
  Ü: "U", ü: "U",
  Ö: "O", ö: "O",
  Ç: "C", ç: "C",
};

export const MONTH_NUMBERS = new Map([
  ["JANUARY", 1], ["OCAK", 1],
  ["FEBRUARY", 2], ["SUBAT", 2],
  ["MARCH", 3], ["MART", 3],
  ["APRIL", 4], ["NISAN", 4],
  ["MAY", 5], ["MAYIS", 5],
  ["JUNE", 6], ["HAZIRAN", 6],
  ["JULY", 7], ["TEMMUZ", 7],
  ["AUGUST", 8], ["AGUSTOS", 8],
  ["SEPTEMBER", 9], ["EYLUL", 9],
  ["OCTOBER", 10], ["EKIM", 10],
  ["NOVEMBER", 11], ["KASIM", 11],
  ["DECEMBER", 12], ["ARALIK", 12],
]);

export const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export const ENGLISH_MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];


export function normalizeLabel(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .trim()
    .replace(/[İIıŞşĞğÜüÖöÇç]/gu, (character) => TURKISH_ASCII[character] ?? character)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toUpperCase()
    .replace(/\s+/gu, " ");
}


export function periodFromTitle(value) {
  const normalized = normalizeLabel(value);
  const year = normalized.match(/\b(20\d{2})\b/u)?.[1];
  const month = [...MONTH_NUMBERS.entries()].find(([name]) => new RegExp(`\\b${name}\\b`, "u").test(normalized))?.[1];
  if (!year || !month) {
    throw new Error(`Rapor dönemi başlıktan okunamadı: ${String(value ?? "boş")}`);
  }
  return { year: Number(year), month };
}


export function turkishUpper(value) {
  return String(value).replace(/i/gu, "İ").replace(/ı/gu, "I").toUpperCase();
}


export function periodKey(period) {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

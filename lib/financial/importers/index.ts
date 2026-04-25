export type { ImportedTransaction, ImportResult } from "./types";
import type { ImportResult } from "./types";
import { parseCSV } from "./csvParser";
import { parsePDF } from "./pdfParser";

export async function importFinancialFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) return parseCSV(file);
  if (name.endsWith(".pdf")) return parsePDF(file);

  return {
    transactions: [],
    rejectedRows: [],
    warnings: [
      `Formato não suportado: "${file.name}". Use arquivos CSV ou PDF com texto selecionável.`,
    ],
    fileName: file.name,
    fileType: "csv", // fallback
  };
}

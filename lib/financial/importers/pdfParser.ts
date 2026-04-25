import type { ImportedTransaction, ImportResult } from "./types";
import { parseDate, parseAmount } from "./normalize";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Heuristic patterns for common Brazilian bank statement lines:
// "01/04/2026 PIX RECEBIDO NOME 1.234,56"
// "10/04/2026 Tarifa bancária -42,90"
// "2026-04-01 Pagamento fornecedor -3200.00"
const TXN_LINE = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-+]?(?:\d{1,3}\.){0,4}\d{1,3}(?:[.,]\d{2})?)\s*$/;

function parseLines(lines: string[]): Pick<ImportResult, "transactions" | "rejectedRows" | "warnings"> {
  const transactions: ImportedTransaction[] = [];
  const rejectedRows: string[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (t.length < 12) continue; // too short to be a transaction

    const m = TXN_LINE.exec(t);
    if (!m) {
      if (t.length > 8) rejectedRows.push(t);
      continue;
    }

    const date = parseDate(m[1]);
    if (!date) { rejectedRows.push(t); continue; }

    const desc = m[2].trim();
    const amount = parseAmount(m[3]);
    if (amount === null) { rejectedRows.push(t); continue; }

    transactions.push({
      id: uid(),
      date,
      description: desc,
      amount,
      type: amount >= 0 ? "credit" : "debit",
      source: "pdf",
      raw: t,
    });
  }

  const warnings: string[] = [];
  if (transactions.length === 0) {
    warnings.push(
      "Nenhuma transação encontrada. O PDF pode estar escaneado (imagem sem texto selecionável) " +
      "ou ter um formato não reconhecido. Exporte o extrato como CSV e tente novamente."
    );
  }

  return { transactions, rejectedRows, warnings };
}

export async function parsePDF(file: File): Promise<ImportResult> {
  // Dynamic import keeps pdfjs-dist out of the server bundle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfjsLib: any;
  try {
    pdfjsLib = await import("pdfjs-dist");
    // Use unpkg CDN for the worker — works in any browser environment
    // including GitHub Pages (requires internet access, which GH Pages has).
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version as string}/build/pdf.worker.min.mjs`;
  } catch {
    return {
      transactions: [], rejectedRows: [],
      warnings: ["Não foi possível carregar o leitor de PDF. Verifique a conexão e tente novamente."],
      fileName: file.name, fileType: "pdf",
    };
  }

  const buffer = await file.arrayBuffer();
  let allLines: string[] = [];

  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer }) as { promise: Promise<unknown> };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await loadingTask.promise as any;
    const pageLines: string[] = [];

    for (let p = 1; p <= (doc.numPages as number); p++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await (doc.getPage(p) as Promise<any>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = await (page.getTextContent() as Promise<any>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText: string = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((item: any) => typeof item.str === "string")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str as string)
        .join(" ");
      pageLines.push(...pageText.split(/\n/));
    }

    allLines = pageLines;
  } catch {
    return {
      transactions: [], rejectedRows: [],
      warnings: [
        "PDF ilegível ou protegido. Verifique se o arquivo não está escaneado (imagem) " +
        "e não possui senha. Exporte o extrato como CSV e tente novamente.",
      ],
      fileName: file.name, fileType: "pdf",
    };
  }

  const { transactions, rejectedRows, warnings } = parseLines(allLines);
  return { transactions, rejectedRows, warnings, fileName: file.name, fileType: "pdf" };
}

import type { ImportedTransaction, ImportResult } from "./types";
import { parseDate, parseAmount } from "./normalize";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Coordinate-based line reconstruction ─────────────────────────────────────
// pdfjs returns text items with 2D transform matrices; transform[4]=X, transform[5]=Y.
// We group items by Y position (with tolerance for same-row items in multi-column tables),
// sort each group left-to-right by X, then join into readable lines.
//
// Y_TOLERANCE=10 handles Bradesco/Itaú tables where cells have 2-8pt vertical variation
// within the same row but rows are ≥14pt apart.

const Y_TOLERANCE = 10;

interface TextItem {
  str: string;
  transform: number[];
}

function reconstructLines(items: TextItem[]): string[] {
  if (items.length === 0) return [];

  // Sort by Y descending then X ascending
  const valid = items
    .filter((i) => i.str.trim())
    .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

  const lines: { str: string; x: number }[][] = [];
  let curLine: { str: string; x: number }[] = [];
  let lineY = valid[0].transform[5];

  for (const item of valid) {
    const y = item.transform[5];
    if (Math.abs(y - lineY) <= Y_TOLERANCE) {
      curLine.push({ str: item.str, x: item.transform[4] });
    } else {
      if (curLine.length) lines.push(curLine);
      curLine = [{ str: item.str, x: item.transform[4] }];
      lineY = y;
    }
  }
  if (curLine.length) lines.push(curLine);

  return lines
    .map((group) =>
      group
        .sort((a, b) => a.x - b.x)
        .map((g) => g.str)
        .join(" ")
        .trim()
    )
    .filter((line) => line.length > 2);
}

// ─── Non-transaction line filter ──────────────────────────────────────────────
// Skip summary, header, and balance rows that are not actual transactions.
const SKIP_LINE = new RegExp(
  "^\\s*(?:" +
  "saldo\\s+do\\s+dia|saldo\\s+anterior|saldo\\s+inicial|saldo\\s+final|saldo\\s+dispon[ií]vel|" +
  "total\\s+de\\s+(?:entradas|sa[ií]das|movimenta[çc][oõ]es|d[ée]bitos|cr[ée]ditos)|" +
  "extrato\\s+do\\s+per[ií]odo|per[ií]odo\\s+de|" +
  "data\\s+hist[oó]rico|hist[oó]rico\\s+doc|" +
  "ag[eê]ncia|conta\\s+corrente|conta\\s+poupan[çc]a|banco\\s+bradesco|banco\\s+btg|" +
  "cnpj|cpf|nome\\s+do\\s+correntista|endere[çc]o|" +
  "p[áa]gina\\s+\\d|folha\\s+\\d|impresso\\s+em|emitido\\s+em|" +
  "(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\\.?\\s+\\d{4}" +
  ")", "i"
);

// ─── Transaction line patterns ────────────────────────────────────────────────
// Handles:
//   DD/MM/AAAA  [doc#]  description  amount  [C|D]  [balance]   (Bradesco, Itaú)
//   DD/MM       [doc#]  description  amount  [C|D]  [balance]   (Cora, Inter, Nubank)
//   AAAA-MM-DD          description  amount  [C|D]  [balance]   (ISO date)
//   any line starting with a date and containing at least one amount

const DATE_FULL  = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
const DATE_SHORT = /\d{1,2}[\/\-]\d{1,2}/;
const DATE_ISO   = /\d{4}-\d{2}-\d{2}/;
const DATE_ANY   = new RegExp(`(${DATE_FULL.source}|${DATE_ISO.source}|${DATE_SHORT.source})`);
const AMOUNT_RE  = /(?:R\$\s*)?[-+]?(?:\d{1,3}\.)*\d{1,3}[.,]\d{2}/g;

// Credit/debit indicator immediately after last transaction amount
const CD_INDICATOR = /\s+([CcDd])[^a-zA-Z0-9,.]|^\s*([CcDd])$/;

function extractCDSign(tail: string): "credit" | "debit" | null {
  // Tail is the text after the transaction amount
  const m = /^\s*([CcDd])(?:\s|$|[^a-zA-Z])/.exec(tail)
         ?? /^\s*(?:créd(?:ito)?|entr(?:ada)?)$/i.exec(tail)
         ?? /^\s*(?:déb(?:ito)?|saíd(?:a)?)$/i.exec(tail);
  if (!m) return null;
  const c = (m[1] ?? m[0]).trim().toLowerCase();
  if (c === "c" || c.startsWith("cr") || c.startsWith("en")) return "credit";
  if (c === "d" || c.startsWith("dé") || c.startsWith("sa")) return "debit";
  return null;
}

function parseLines(lines: string[]): Pick<ImportResult, "transactions" | "rejectedRows" | "warnings"> {
  const transactions: ImportedTransaction[] = [];
  const rejectedRows: string[] = [];
  const currentYear = new Date().getFullYear();

  for (const raw of lines) {
    const t = raw.trim();
    if (t.length < 8) continue;

    // Skip non-transaction content (headers, summaries, balance rows)
    if (SKIP_LINE.test(t)) continue;

    // Must start with a date
    const dateMatch = DATE_ANY.exec(t);
    if (!dateMatch || dateMatch.index > 2) {
      if (t.length > 6) rejectedRows.push(t);
      continue;
    }

    let rawDate = dateMatch[1];
    if (/^\d{1,2}[\/\-]\d{1,2}$/.test(rawDate)) {
      rawDate = `${rawDate}/${currentYear}`;
    }
    const date = parseDate(rawDate);
    if (!date) { rejectedRows.push(t); continue; }

    // Find all amounts in the rest of the line
    const rest = t.slice(dateMatch.index + dateMatch[0].length).trim();
    const amounts = [...rest.matchAll(AMOUNT_RE)];
    if (amounts.length === 0) { rejectedRows.push(t); continue; }

    // Heuristic: if there are ≥2 amounts, the last one is likely the running balance.
    // Use the second-to-last as the transaction amount, otherwise use the only/last one.
    const txnAmtMatch = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
    const txnAmtRaw   = txnAmtMatch[0].replace(/^R\$\s*/, "");
    let amount = parseAmount(txnAmtRaw);
    if (amount === null) { rejectedRows.push(t); continue; }

    // Determine credit/debit from C/D indicator after the transaction amount
    const txnAmtEnd = rest.indexOf(txnAmtMatch[0]) + txnAmtMatch[0].length;
    const tail = rest.slice(txnAmtEnd);
    const cdSign = extractCDSign(tail);
    if (cdSign === "debit" && amount > 0) amount = -amount;
    else if (cdSign === "credit" && amount < 0) amount = Math.abs(amount);

    // Extract description: everything between date and first amount, minus doc numbers
    const firstAmtIdx = rest.indexOf(amounts[0][0]);
    let desc = rest.slice(0, firstAmtIdx).trim();
    // Remove leading doc# (pure digit sequences ≤12 chars)
    desc = desc.replace(/^\d{1,12}\s+/, "").trim();
    if (!desc) desc = rest.slice(0, Math.max(firstAmtIdx, 4)).trim() || t;

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
      "Nenhuma transação reconhecida. O PDF pode estar escaneado (imagem sem texto selecionável) " +
      "ou ter um layout fora do padrão. Tente exportar o extrato como CSV/OFX."
    );
  }

  return { transactions, rejectedRows, warnings };
}

export async function parsePDF(file: File): Promise<ImportResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfjsLib: any;
  try {
    pdfjsLib = await import("pdfjs-dist");
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

    for (let p = 1; p <= (doc.numPages as number); p++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await (doc.getPage(p) as Promise<any>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = await (page.getTextContent() as Promise<any>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = content.items.filter((i: any) => typeof i.str === "string") as TextItem[];
      allLines.push(...reconstructLines(items));
    }
  } catch {
    return {
      transactions: [], rejectedRows: [],
      warnings: [
        "PDF ilegível ou protegido por senha. Verifique se o arquivo não está escaneado (imagem) " +
        "e não possui senha. Tente exportar o extrato como CSV/OFX.",
      ],
      fileName: file.name, fileType: "pdf",
    };
  }

  const { transactions, rejectedRows, warnings } = parseLines(allLines);
  return { transactions, rejectedRows, warnings, fileName: file.name, fileType: "pdf" };
}

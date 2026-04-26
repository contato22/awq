import type { ImportedTransaction, ImportResult } from "./types";
import { parseDate, parseAmount } from "./normalize";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Coordinate-based line reconstruction ────────────────────────────────────
// pdfjs text items carry a transform matrix; [4]=X, [5]=Y.
// We group items within Y_TOLERANCE of each other (same visual row),
// sort each group left→right by X, then join into readable strings.

const Y_TOLERANCE = 10;

interface TextItem {
  str: string;
  transform: number[];
}

function reconstructLines(items: TextItem[]): string[] {
  if (items.length === 0) return [];

  const valid = items
    .filter((i) => i.str.trim())
    .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

  const lines: { str: string; x: number }[][] = [];
  let curGroup: { str: string; x: number }[] = [];
  let lineY = valid[0].transform[5];

  for (const item of valid) {
    if (Math.abs(item.transform[5] - lineY) <= Y_TOLERANCE) {
      curGroup.push({ str: item.str, x: item.transform[4] });
    } else {
      if (curGroup.length) lines.push(curGroup);
      curGroup = [{ str: item.str, x: item.transform[4] }];
      lineY = item.transform[5];
    }
  }
  if (curGroup.length) lines.push(curGroup);

  return lines
    .map((g) => g.sort((a, b) => a.x - b.x).map((i) => i.str).join(" ").trim())
    .filter((l) => l.length > 2);
}

// ─── Non-transaction line patterns ───────────────────────────────────────────

const SKIP_LINE = new RegExp(
  "^\\s*(?:" +
    "saldo\\s+inicial|saldo\\s+anterior|saldo\\s+final|saldo\\s+dispon[ií]vel|" +
    "total\\s+de\\s+(?:entradas|sa[ií]das|movimenta|d[ée]bitos|cr[ée]ditos)|" +
    "extrato\\s+do\\s+per[ií]odo|per[ií]odo\\s+de|" +
    "data\\s+hist[oó]rico|hist[oó]rico|lançamentos|" +
    "ag[eê]ncia|conta\\s+corrente|conta\\s+poupan|banco\\s+bradesco|banco\\s+btg|" +
    "cnpj|cpf|nome\\s+do\\s+correntista|endere[çc]o|" +
    "p[áa]gina\\s+\\d|folha\\s+\\d|impresso\\s+em|emitido\\s+em|" +
    "transaç[oõ]es\\s*$" +  // section header "Transações"
  ")", "i"
);

const BALANCE_LINE = /^saldo\s+do\s+dia/i; // balance checkpoint — carries date but is not a transaction

// ─── Amount extraction ────────────────────────────────────────────────────────
// Handles: "– R$ 339,06"  "R$ 9.000,00"  "9.000,00 D"  "500,00"  "-1.500,00"
// Em dash (–) and en dash (—) are treated as debit signals.

const AMT_RE = /(?:\d{1,3}\.)*\d{1,3}[.,]\d{2}/g;

interface ParsedAmt {
  amount: number;
  descEnd: number; // index in text where description ends
}

function extractAmount(text: string): ParsedAmt | null {
  // Normalize typographic dashes → regular hyphen for uniform parsing
  const norm = text.replace(/[–—]/g, "-");

  const matches = [...norm.matchAll(AMT_RE)];
  if (matches.length === 0) return null;

  // If ≥ 2 amounts, the LAST is often the running balance; use second-to-last as the transaction value.
  // Exception: if the last amount is preceded by a debit marker "- R$", use it.
  const debitFull = /(?:^|\s)-\s*(?:R\$\s*)?((?:\d{1,3}\.)*\d{1,3}[.,]\d{2})/.exec(norm);

  let rawAmt: string;
  let matchStart: number;
  let isDebit = false;

  if (debitFull) {
    rawAmt = debitFull[1];
    matchStart = debitFull.index;
    isDebit = true;
  } else {
    const pick = matches.length >= 2 ? matches[matches.length - 2] : matches[matches.length - 1];
    rawAmt = pick[0];
    matchStart = pick.index!;
    // Check C/D indicator that immediately follows
    const tail = norm.slice(pick.index! + pick[0].length).trimStart();
    if (/^[Dd](?:\s|$|[^a-zA-Z])/.test(tail) || /^[Dd][ée]b/.test(tail)) isDebit = true;
  }

  let amount = parseAmount(rawAmt);
  if (amount === null) return null;
  if (isDebit && amount > 0) amount = -amount;
  if (!isDebit && amount < 0) isDebit = true; // already signed negative

  return { amount, descEnd: matchStart };
}

// ─── Description extraction ───────────────────────────────────────────────────
function extractDesc(text: string, descEnd: number): string {
  return text
    .slice(0, descEnd)
    .replace(/[-–]\s*R\$\s*$/, "")  // strip trailing "- R$"
    .replace(/\s+R\$\s*$/, "")       // strip trailing "R$"
    .replace(/[-–]\s*$/, "")          // strip trailing dash
    .trim();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DATE_START = /^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{4}-\d{2}-\d{2})\s*([\s\S]*)/;
const currentYear = new Date().getFullYear();

function readDate(raw: string): string | null {
  let r = raw;
  if (/^\d{1,2}[\/\-]\d{1,2}$/.test(r)) r = `${r}/${currentYear}`;
  return parseDate(r);
}

// ─── Main parser ──────────────────────────────────────────────────────────────
// Many Brazilian bank PDFs (Bradesco, Itaú) put the date only on the
// "Saldo do dia" balance row, NOT on each transaction row.
// Strategy:
//   1. Buffer transactions that arrive without a date.
//   2. When we see "Saldo do dia" (which carries a date), flush the buffer
//      with that date and skip the balance row itself.
//   3. Fallback: if a transaction line itself starts with a date, use it directly.

function parseLines(lines: string[]): Pick<ImportResult, "transactions" | "rejectedRows" | "warnings"> {
  const transactions: ImportedTransaction[] = [];
  const pending: Omit<ImportedTransaction, "date">[] = []; // awaiting date
  const rejectedRows: string[] = [];
  let lastDate: string | null = null;

  function flush(date: string) {
    for (const p of pending) transactions.push({ ...p, date });
    pending.length = 0;
    lastDate = date;
  }

  for (const raw of lines) {
    const t = raw.trim();
    if (t.length < 6) continue;
    if (SKIP_LINE.test(t)) continue;

    // Try to parse a date from the start of the line
    const dm = DATE_START.exec(t);
    const parsedDate = dm ? readDate(dm[1]) : null;
    const lineContent = parsedDate && dm ? dm[2].trim() : t;

    // Balance checkpoint: "Saldo do dia" (with or without date prefix)
    if (BALANCE_LINE.test(lineContent) || BALANCE_LINE.test(t)) {
      if (parsedDate) flush(parsedDate);
      continue;
    }

    // Skip lines with no parseable content
    if (!lineContent || lineContent.length < 4) continue;

    // Parse the transaction content
    const amt = extractAmount(lineContent);
    if (!amt) {
      // No amount found — might be a description continuation or truly non-transaction
      if (lineContent.length > 6) rejectedRows.push(t);
      continue;
    }

    const desc = extractDesc(lineContent, amt.descEnd);
    if (!desc || desc.length < 2) {
      rejectedRows.push(t);
      continue;
    }

    const txn: Omit<ImportedTransaction, "date"> = {
      id: uid(),
      description: desc,
      amount: amt.amount,
      type: amt.amount >= 0 ? "credit" : "debit",
      source: "pdf",
      raw: t,
    };

    if (parsedDate) {
      // Transaction has its own date on the same line
      transactions.push({ ...txn, date: parsedDate });
      lastDate = parsedDate;
      flush(parsedDate); // flush any preceding undated txns with this date
    } else if (lastDate) {
      // Use the most recently established date
      transactions.push({ ...txn, date: lastDate });
    } else {
      // Date not yet known — buffer until we see a Saldo do dia or dated line
      pending.push(txn);
    }
  }

  // Flush remaining pending with last known date (or today as fallback)
  if (pending.length > 0) {
    const fallback = lastDate ?? new Date().toISOString().slice(0, 10);
    for (const p of pending) transactions.push({ ...p, date: fallback });
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

// ─── Public entry point ───────────────────────────────────────────────────────

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

import type { ImportedTransaction, ImportResult } from "./types";
import { parseDate, parseAmount } from "./normalize";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Coordinate-based line reconstruction ─────────────────────────────────────
// pdfjs returns text items with 2D transform matrices; transform[4] = X, transform[5] = Y.
// Items on the same visual line share roughly the same Y. We group by Y (with tolerance),
// sort each group left-to-right by X, then join — giving us actual readable lines.

const Y_TOLERANCE = 4; // pixels; items within this range are on the same line

interface TextItem {
  str: string;
  transform: number[];
}

function reconstructLines(items: TextItem[]): string[] {
  const buckets = new Map<number, { str: string; x: number }[]>();

  for (const item of items) {
    const raw = item.str;
    if (!raw.trim()) continue;
    const y = Math.round(item.transform[5] / Y_TOLERANCE) * Y_TOLERANCE;
    const x = item.transform[4];
    if (!buckets.has(y)) buckets.set(y, []);
    buckets.get(y)!.push({ str: raw, x });
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => b - a) // descending Y = top of page first
    .map(([, group]) =>
      group
        .sort((a, b) => a.x - b.x) // left to right
        .map((g) => g.str)
        .join(" ")
        .trim()
    )
    .filter((line) => line.length > 2);
}

// ─── Transaction line patterns ────────────────────────────────────────────────
// Covers common Brazilian bank statement formats:
//   DD/MM/AAAA description amount               (full date, Itaú, Bradesco)
//   DD/MM description amount                    (short date — Cora, Inter, Nubank)
//   AAAA-MM-DD description amount               (ISO date)
//   DD/MM description amount C                  (Cora: trailing C/D indicator)
//   DD/MM description amount saldo              (with running balance column)
//   DD/MM description amount C saldo            (Cora with both)

const DATE_FULL  = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
const DATE_SHORT = /\d{1,2}[\/\-]\d{1,2}/;
const DATE_ISO   = /\d{4}-\d{2}-\d{2}/;
// Matches amounts like: 1.234,56  1234,56  1.234.567,89  R$ 1.234,56  -1.234,56
const AMOUNT_PAT = /(?:R\$\s*)?[-+]?(?:\d{1,3}\.)*\d{1,3}[.,]\d{2}/;
// Trailing noise after the amount: C D Cr Db crédito débito + optional running balance
const TRAIL = /(?:\s+(?:[CcDd][Rr]?[ée]?(?:dito|bito)?|Entrada|Saída))?(?:\s+(?:R\$\s*)?[-+]?(?:\d{1,3}\.)*\d{1,3}[.,]\d{2})*\s*$/;

// Build a single regex that captures date | description | amount and ignores trailing columns
function makeTxnRe(datePat: RegExp): RegExp {
  return new RegExp(
    `^(${datePat.source})\\s+(.+?)\\s+(${AMOUNT_PAT.source})${TRAIL.source}`
  );
}

const TXN_FULL  = makeTxnRe(new RegExp(`${DATE_FULL.source}|${DATE_ISO.source}`));
const TXN_SHORT = makeTxnRe(DATE_SHORT);

function parseLines(lines: string[]): Pick<ImportResult, "transactions" | "rejectedRows" | "warnings"> {
  const transactions: ImportedTransaction[] = [];
  const rejectedRows: string[] = [];
  const currentYear = new Date().getFullYear();

  for (const raw of lines) {
    const t = raw.trim();
    if (t.length < 8) continue;

    let m = TXN_FULL.exec(t) ?? TXN_SHORT.exec(t);
    if (!m) {
      if (t.length > 6) rejectedRows.push(t);
      continue;
    }

    let rawDate = m[1];
    // Inject year for short dates like "01/04"
    if (/^\d{1,2}[\/\-]\d{1,2}$/.test(rawDate)) {
      rawDate = `${rawDate}/${currentYear}`;
    }

    const date = parseDate(rawDate);
    if (!date) { rejectedRows.push(t); continue; }

    const desc = m[2].trim();
    // Strip R$ prefix before parsing amount
    const rawAmt = m[3].replace(/^R\$\s*/, "");
    const amount = parseAmount(rawAmt);
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

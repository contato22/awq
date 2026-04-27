import type { ImportedTransaction, ImportResult } from "./types";
import { parseDate, parseAmount } from "./normalize";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectSeparator(firstLine: string): string {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function splitLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === sep && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function findIdx(headers: string[], candidates: string[]): number {
  for (const cand of candidates) {
    const i = headers.findIndex((h) => h.includes(cand));
    if (i >= 0) return i;
  }
  return -1;
}

// ─── Bank detection ───────────────────────────────────────────────────────────

function detectBankFromCSV(fileName: string, headerLine: string): { bank: string; accountHints: string[] } | null {
  const name = fileName.toLowerCase();
  const header = headerLine.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Filename-based detection (most reliable when banks export named files)
  const fileBankMap: [RegExp, string][] = [
    [/cora/, "Cora"],
    [/itau|itaú/, "Itaú"],
    [/btg/, "BTG Empresas"],
    [/nubank/, "Nubank"],
    [/inter/, "Inter"],
    [/bradesco/, "Bradesco"],
    [/santander/, "Santander"],
    [/banco.?do.?brasil|bb\./, "Banco do Brasil"],
  ];
  for (const [re, bank] of fileBankMap) {
    if (re.test(name)) {
      const hints = extractAccountHints(name);
      return { bank, accountHints: hints };
    }
  }

  // Header-based detection (column names / encoding hints per bank)
  if (header.includes("cora")) return { bank: "Cora", accountHints: extractAccountHints(header) };
  if (header.includes("itau") || header.includes("itaú")) return { bank: "Itaú", accountHints: extractAccountHints(header) };
  if (header.includes("btg")) return { bank: "BTG Empresas", accountHints: ["venture"] };
  if (header.includes("nubank")) return { bank: "Nubank", accountHints: [] };

  return null;
}

function extractAccountHints(text: string): string[] {
  const hints: string[] = [];
  if (/jacqes/.test(text)) hints.push("jacqes");
  if (/holding|awq/.test(text)) hints.push("holding");
  if (/caza|vision/.test(text)) hints.push("caza");
  return hints;
}

export async function parseCSV(file: File): Promise<ImportResult> {
  const text = await file.text();
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (rawLines.length < 2) {
    return {
      transactions: [], rejectedRows: [],
      warnings: ["Arquivo CSV vazio ou sem dados."],
      fileName: file.name, fileType: "csv",
      detectedBank: null, detectedAccountHints: [],
    };
  }

  const sep = detectSeparator(rawLines[0]);
  const headers = splitLine(rawLines[0], sep).map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  );

  const dateIdx   = findIdx(headers, ["data lancamento", "data", "date", "dt "]);
  const descIdx   = findIdx(headers, ["descricao", "historico", "memo", "description", "narrative", "lancamento", "lançamento"]);
  const valIdx    = findIdx(headers, ["valor", "amount", "vlr", "value"]);
  const debitIdx  = findIdx(headers, ["debito", "saida", "debit", "saidas"]);
  const creditIdx = findIdx(headers, ["credito", "entrada", "credit", "entradas"]);

  const transactions: ImportedTransaction[] = [];
  const rejectedRows: string[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const cols = splitLine(raw, sep);

    const dateStr = dateIdx >= 0 ? (cols[dateIdx] ?? "") : (cols[0] ?? "");
    const date = parseDate(dateStr);
    if (!date) { rejectedRows.push(raw); continue; }

    const desc = (descIdx >= 0 ? cols[descIdx] : cols[1]) ?? "";

    let amount: number | null = null;
    let type: "credit" | "debit" | "unknown" = "unknown";

    if (valIdx >= 0 && cols[valIdx]) {
      amount = parseAmount(cols[valIdx]);
      if (amount !== null) type = amount >= 0 ? "credit" : "debit";
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debit  = debitIdx  >= 0 ? parseAmount(cols[debitIdx]  ?? "") : null;
      const credit = creditIdx >= 0 ? parseAmount(cols[creditIdx] ?? "") : null;
      if (credit && Math.abs(credit) > 0) { amount = Math.abs(credit);  type = "credit"; }
      else if (debit && Math.abs(debit) > 0) { amount = -Math.abs(debit); type = "debit"; }
    }

    if (amount === null) { rejectedRows.push(raw); continue; }

    transactions.push({ id: uid(), date, description: desc.trim(), amount, type, source: "csv", raw });
  }

  const warnings: string[] = [];
  if (transactions.length === 0 && rejectedRows.length > 0) {
    warnings.push("Nenhuma transação reconhecida. Verifique se o CSV tem colunas de data e valor.");
  }

  const bankInfo = detectBankFromCSV(file.name, rawLines[0]);
  return {
    transactions, rejectedRows, warnings,
    fileName: file.name, fileType: "csv",
    detectedBank: bankInfo?.bank ?? null,
    detectedAccountHints: bankInfo?.accountHints ?? [],
  };
}

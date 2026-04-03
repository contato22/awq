// ─── AWQ Bank Parsers — Deterministic text extraction + optional Claude ────────
//
// APPROACH (two-tier):
//   Tier 1 — Rule-based (always runs, no API key required):
//     Uses pdf-parse to extract text from the PDF, then applies bank-specific
//     regex patterns for Cora and Itaú. Zero external API calls.
//
//   Tier 2 — Claude enhancement (runs only when ANTHROPIC_API_KEY is set):
//     If rule-based extraction returns 0 transactions (e.g. image-only PDF or
//     unexpected format), falls back to Claude vision API.
//
// RESULT: pipeline works without any API key for standard text-based PDFs.
//         Claude adds resilience for edge cases when key is configured.
//
// DO NOT import this module in client components — uses Node's `fs` + pdf-parse.

// Import from internal path to avoid pdf-parse's test-runner side-effect
// (the package root tries to open ./test/data/05-versions-space.pdf at import time).
// eslint-disable-next-line
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse");

// ─── Parsed transaction schema (raw, pre-classification) ─────────────────────

export interface ParsedTransaction {
  transactionDate: string;       // YYYY-MM-DD
  descriptionOriginal: string;   // verbatim from statement
  amount: number;                // positive = credit, negative = debit
  direction: "credit" | "debit";
  runningBalance: number | null;
  extractionNote: string | null;
}

export interface ParsedStatement {
  bank: string;
  accountNumber: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  transactions: ParsedTransaction[];
  parserConfidence: "high" | "medium" | "low";
  extractionNotes: string;
}

// ─── Currency helpers ─────────────────────────────────────────────────────────

// Parses "1.500,00" or "1500.00" or "-500,50" → number
function parseBRL(raw: string): number {
  const clean = raw
    .replace(/\s/g, "")
    .replace(/\./g, "")   // remove thousand separators
    .replace(",", ".");   // decimal comma → dot
  return parseFloat(clean) || 0;
}

// Parses a Brazilian date DD/MM/YYYY or DD/MM/YY → YYYY-MM-DD
function parseBRDate(raw: string): string {
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return raw;
  const [, dd, mm, yy] = m;
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year}-${mm}-${dd}`;
}

// ─── Cora parser ──────────────────────────────────────────────────────────────
//
// Cora extrato typical text pattern (one line per transaction):
//   01/03/2026   Pix recebido - João Silva              +1.500,00   1.500,00
// or split across lines. We match lines with a date + description + two amounts.

function parseCora(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Line pattern: date | optional spaces | description | signed amount | optional balance
  // Handles both "+" prefix and negative values for debits
  const lineRe =
    /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s{2,}([+-]?\d[\d.,]*)\s*([+-]?\d[\d.,]*)?$/gm;

  for (const m of Array.from(text.matchAll(lineRe))) {
    const [, dateRaw, descRaw, amountRaw, balanceRaw] = m;
    const date = parseBRDate(dateRaw.trim());
    const desc = descRaw.trim().replace(/\s+/g, " ");
    const rawAmt = amountRaw.replace(/\+/, "");
    const amount = parseBRL(rawAmt);
    if (amount === 0) continue; // skip header or zero lines

    const direction: "credit" | "debit" = amount >= 0 ? "credit" : "debit";
    const runningBalance = balanceRaw ? parseBRL(balanceRaw) : null;

    transactions.push({
      transactionDate: date,
      descriptionOriginal: desc,
      amount,
      direction,
      runningBalance,
      extractionNote: null,
    });
  }

  return transactions;
}

// ─── Itaú parser ──────────────────────────────────────────────────────────────
//
// Itaú extrato PJ typical text pattern:
//   01/03/26  PIX REC JOAO SILVA        12345   1.500,00 C   1.500,00 C
// or:
//   01/03/26  TARIFA MANUTENCAO                   15,50 D     485,00 C
//
// The D/C suffix indicates Debit/Credit.

function parseItau(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Pattern: date | description | optional doc number | amount + D/C | optional balance + D/C
  const lineRe =
    /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s{2,}(?:\d+\s+)?(\d[\d.,]*)\s*([DC])\s*(?:(\d[\d.,]*)\s*[DC])?/gm;

  for (const m of Array.from(text.matchAll(lineRe))) {
    const [, dateRaw, descRaw, amountRaw, dcFlag, balanceRaw] = m;
    const date = parseBRDate(dateRaw.trim());
    const desc = descRaw.trim().replace(/\s+/g, " ");
    const absAmount = parseBRL(amountRaw);
    if (absAmount === 0) continue;

    const direction: "credit" | "debit" = dcFlag === "C" ? "credit" : "debit";
    const amount = direction === "debit" ? -absAmount : absAmount;
    const runningBalance = balanceRaw ? parseBRL(balanceRaw) : null;

    transactions.push({
      transactionDate: date,
      descriptionOriginal: desc,
      amount,
      direction,
      runningBalance,
      extractionNote: null,
    });
  }

  return transactions;
}

// ─── Nubank parser ────────────────────────────────────────────────────────────
//
// Nubank extrato PJ typical text pattern:
//   01/03/2026  Pix enviado - João Silva              -R$ 500,00
//   01/03/2026  Recebimento Pix - Maria Santos        +R$ 1.200,00
//   01/03/2026  Compra no débito - Mercado Livre       -R$ 89,90
//
// Values are prefixed with R$ and a sign.

function parseNubank(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Pattern: date | description | R$ amount (with sign)
  const lineRe =
    /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s{2,}([+-])?R\$\s*([\d.,]+)/gm;

  for (const m of Array.from(text.matchAll(lineRe))) {
    const [, dateRaw, descRaw, signRaw, amountRaw] = m;
    const date = parseBRDate(dateRaw.trim());
    const desc = descRaw.trim().replace(/\s+/g, " ");
    const absAmount = parseBRL(amountRaw);
    if (absAmount === 0) continue;

    const isDebit = signRaw === "-";
    const amount = isDebit ? -absAmount : absAmount;
    const direction: "credit" | "debit" = isDebit ? "debit" : "credit";

    transactions.push({
      transactionDate: date,
      descriptionOriginal: desc,
      amount,
      direction,
      runningBalance: null,
      extractionNote: null,
    });
  }

  return transactions;
}

// ─── Inter parser ─────────────────────────────────────────────────────────────
//
// Banco Inter extrato PJ typical text pattern:
//   01/03/2026  PIX - João Silva                     500,00 D
//   01/03/2026  PIX - Maria Santos                  1.200,00 C
//   01/03/2026  Tarifa de manutenção                   15,90 D
//
// D/C suffix (same as Itaú) but without document number column.

function parseInter(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const lineRe =
    /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s{2,}(\d[\d.,]*)\s*([DC])/gm;

  for (const m of Array.from(text.matchAll(lineRe))) {
    const [, dateRaw, descRaw, amountRaw, dcFlag] = m;
    const date = parseBRDate(dateRaw.trim());
    const desc = descRaw.trim().replace(/\s+/g, " ");
    const absAmount = parseBRL(amountRaw);
    if (absAmount === 0) continue;

    const direction: "credit" | "debit" = dcFlag === "C" ? "credit" : "debit";
    const amount = direction === "debit" ? -absAmount : absAmount;

    transactions.push({
      transactionDate: date,
      descriptionOriginal: desc,
      amount,
      direction,
      runningBalance: null,
      extractionNote: null,
    });
  }

  return transactions;
}

// ─── Generic fallback parser ──────────────────────────────────────────────────
//
// Tries to extract any line that has a date-like prefix and at least one amount.

function parseGeneric(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const lineRe = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([+-]?\d[\d.,]+(?:[.,]\d{2}))/gm;

  for (const m of Array.from(text.matchAll(lineRe))) {
    const [, dateRaw, descRaw, amountRaw] = m;
    const date = parseBRDate(dateRaw.trim());
    const desc = descRaw.trim().replace(/\s+/g, " ");
    const rawAmt = amountRaw.replace(/\+/, "");
    const amount = parseBRL(rawAmt);
    if (amount === 0 || !date.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    const direction: "credit" | "debit" = amount >= 0 ? "credit" : "debit";

    transactions.push({
      transactionDate: date,
      descriptionOriginal: desc,
      amount,
      direction,
      runningBalance: null,
      extractionNote: "parser genérico — verificar manualmente",
    });
  }

  return transactions;
}

// ─── Period and balance extraction ───────────────────────────────────────────

function extractPeriod(
  text: string
): { periodStart: string | null; periodEnd: string | null } {
  // Looks for "Período: 01/01/2026 a 31/03/2026" or "De 01/01/2026 até 31/03/2026"
  const periodRe =
    /(?:per[íi]odo|de|from)[:\s]+(\d{2}\/\d{2}\/\d{2,4})\s+(?:a|at[eé]|to|-)\s+(\d{2}\/\d{2}\/\d{2,4})/i;
  const m = text.match(periodRe);
  if (m) {
    return {
      periodStart: parseBRDate(m[1]),
      periodEnd: parseBRDate(m[2]),
    };
  }
  return { periodStart: null, periodEnd: null };
}

function extractBalance(
  text: string,
  keyword: string
): number | null {
  const re = new RegExp(keyword + "[^\\n]*?([+-]?\\d[\\d.,]+(?:[.,]\\d{2}))", "i");
  const m = text.match(re);
  if (!m) return null;
  return parseBRL(m[1]);
}

function extractAccountNumber(text: string): string | null {
  // "Conta: 12345-6" or "Account: 12345-6 / 0001"
  const m = text.match(/(?:conta|account|ag[êe]ncia)[:\s#]+[\d./-]+\s*([\d]+[-][\d]+)/i);
  return m ? m[1] : null;
}

// ─── Rule-based entry point ───────────────────────────────────────────────────

async function parseWithRules(
  pdfBuffer: Buffer,
  bankHint: string
): Promise<ParsedStatement> {
  let text = "";
  try {
    const data = await pdfParse(pdfBuffer);
    text = data.text;
  } catch (err) {
    return {
      bank: bankHint,
      accountNumber: null,
      periodStart: null,
      periodEnd: null,
      openingBalance: null,
      closingBalance: null,
      transactions: [],
      parserConfidence: "low",
      extractionNotes:
        `pdf-parse falhou na leitura do texto: ${err instanceof Error ? err.message : String(err)}. ` +
        `O PDF pode ser baseado em imagem (escaneado). ` +
        `Configure ANTHROPIC_API_KEY para habilitar extração via OCR/Claude Vision.`,
    };
  }

  if (!text.trim()) {
    return {
      bank: bankHint,
      accountNumber: null,
      periodStart: null,
      periodEnd: null,
      openingBalance: null,
      closingBalance: null,
      transactions: [],
      parserConfidence: "low",
      extractionNotes:
        "PDF sem camada de texto (provavelmente escaneado). " +
        "Configure ANTHROPIC_API_KEY para habilitar extração via Claude Vision.",
    };
  }

  // Select parser by bank hint — most specific first, generic last
  let transactions: ParsedTransaction[];
  const bankLower = bankHint.toLowerCase();

  if (bankLower.includes("cora")) {
    transactions = parseCora(text);
  } else if (bankLower.includes("nubank")) {
    transactions = parseNubank(text);
    if (transactions.length === 0) transactions = parseCora(text); // Nubank layout varies by export
  } else if (bankLower.includes("inter")) {
    transactions = parseInter(text);
    if (transactions.length === 0) transactions = parseItau(text);  // similar D/C format
  } else if (
    bankLower.includes("itaú") || bankLower.includes("itau") ||
    bankLower.includes("bradesco") || bankLower.includes("santander") ||
    bankLower.includes("sicoob") || bankLower.includes("sicredi") ||
    bankLower.includes("banco do brasil") || bankLower.includes("bb")
  ) {
    // Traditional banks share the D/C column convention
    transactions = parseItau(text);
  } else if (
    bankLower.includes("c6") || bankLower.includes("pagbank") ||
    bankLower.includes("pag bank") || bankLower.includes("btg") ||
    bankLower.includes("xp") || bankLower.includes("mercado pago")
  ) {
    // Digital banks tend to use signed values like Nubank
    transactions = parseNubank(text);
    if (transactions.length === 0) transactions = parseCora(text);
  } else {
    // Unknown bank — try all parsers in order of specificity
    transactions = parseCora(text);
    if (transactions.length === 0) transactions = parseNubank(text);
    if (transactions.length === 0) transactions = parseItau(text);
    if (transactions.length === 0) transactions = parseGeneric(text);
  }

  const { periodStart, periodEnd } = extractPeriod(text);
  const openingBalance = extractBalance(text, "saldo anterior|saldo inicial|opening balance");
  const closingBalance = extractBalance(text, "saldo final|saldo atual|closing balance");
  const accountNumber = extractAccountNumber(text);

  const confidence: "high" | "medium" | "low" =
    transactions.length >= 5
      ? "high"
      : transactions.length >= 1
      ? "medium"
      : "low";

  const notes =
    transactions.length > 0
      ? `Parser determinístico (${bankHint}): ${transactions.length} lançamentos extraídos. ` +
        `Período: ${periodStart ?? "não detectado"} → ${periodEnd ?? "não detectado"}.`
      : `Parser determinístico: nenhum lançamento encontrado no texto extraído. ` +
        `Verifique o formato do extrato. Texto extraído (primeiros 300 chars): ${text.slice(0, 300)}`;

  return {
    bank: bankHint,
    accountNumber,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    transactions,
    parserConfidence: confidence,
    extractionNotes: notes,
  };
}

// ─── Claude fallback (only when API key configured) ───────────────────────────

async function parseWithClaude(
  pdfBase64: string,
  bankHint: string,
  apiKey: string
): Promise<ParsedStatement> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const bankHints: Record<string, string> = {
    Cora:            "Extrato Banco Cora (fintech PME). Colunas: Data | Descrição | Valor | Saldo. Débitos negativos ou com sinal '-'; créditos positivos ou '+'. Formato de data DD/MM/YYYY.",
    Nubank:          "Extrato Nubank PJ. Valores prefixados por R$ com sinal: -R$ para débito, +R$ para crédito. Sem coluna de saldo em alguns formatos. Data DD/MM/YYYY.",
    Inter:           "Extrato Banco Inter PJ. Colunas: Data | Descrição | Valor | D/C onde D=Débito e C=Crédito. Sem número de documento. Data DD/MM/YYYY.",
    "C6 Bank":       "Extrato C6 Bank PJ. Similar ao Nubank: valores com sinal +/- e prefixo R$. Data DD/MM/YYYY.",
    PagBank:         "Extrato PagBank (PagSeguro) PJ. Valores com sinal, descrições incluem Pix, TED, Boleto. Data DD/MM/YYYY.",
    "BTG Empresas":  "Extrato BTG Empresas. Colunas: Data | Descrição | Valor | Saldo. Valores negativos para débito. Data DD/MM/YYYY.",
    XP:              "Extrato XP Investimentos conta corrente. Valores com sinal. Data DD/MM/YYYY.",
    "Mercado Pago":  "Extrato Mercado Pago. Débitos e créditos com sinal, descrições incluem Pix, pagamentos e recebimentos. Data DD/MM/YYYY.",
    Itaú:            "Extrato Banco Itaú PJ. Colunas: Data | Histórico | Documento | Valor | D/C | Saldo. D=Débito C=Crédito. Data DD/MM/YY.",
    Bradesco:        "Extrato Banco Bradesco PJ. Colunas: Data | Histórico | Documento | Débito | Crédito | Saldo. Colunas separadas para débito e crédito. Data DD/MM/YY.",
    "Banco do Brasil": "Extrato Banco do Brasil PJ. Colunas: Data | Histórico | Documento | Valor | D/C | Saldo. D=Débito C=Crédito. Data DD/MM/YY.",
    Santander:       "Extrato Santander PJ. Colunas: Data | Descrição | Documento | Débito | Crédito | Saldo. Data DD/MM/YYYY.",
    Sicoob:          "Extrato Sicoob cooperativa. Colunas: Data | Histórico | Documento | Valor | D/C | Saldo. D=Débito C=Crédito. Data DD/MM/YYYY.",
    Sicredi:         "Extrato Sicredi cooperativa. Similar ao Sicoob. Colunas: Data | Histórico | Valor | D/C | Saldo. Data DD/MM/YYYY.",
  };
  const hint = bankHints[bankHint] ?? "Extrato bancário brasileiro. Extraia data (YYYY-MM-DD), descrição original, valor (negativo=débito) e saldo quando disponível.";

  interface RawTxn { transaction_date?: string; description_original?: string; amount?: number; direction?: string; running_balance?: number | null; extraction_note?: string | null; }
  interface RawResp { bank?: string; account_number?: string | null; period_from?: string | null; period_to?: string | null; opening_balance?: number | null; closing_balance?: number | null; parser_confidence?: string; extraction_notes?: string; transactions?: RawTxn[]; }

  let raw = "";
  try {
    const resp = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: `Você é um extrator de dados de extratos bancários brasileiros. Retorne SOMENTE JSON válido. ${hint}`,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: `Extraia todos os lançamentos. JSON: {"bank":"","account_number":null,"period_from":null,"period_to":null,"opening_balance":null,"closing_balance":null,"parser_confidence":"high","extraction_notes":"","transactions":[{"transaction_date":"YYYY-MM-DD","description_original":"","amount":0.0,"direction":"credit","running_balance":null,"extraction_note":null}]}` },
        ],
      }],
    });
    raw = resp.content?.[0]?.type === "text" ? resp.content[0].text : "";
  } catch (err) {
    return {
      bank: bankHint, accountNumber: null, periodStart: null, periodEnd: null,
      openingBalance: null, closingBalance: null, transactions: [],
      parserConfidence: "low",
      extractionNotes: `Claude API erro: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const p = JSON.parse(clean) as RawResp;
    const txns: ParsedTransaction[] = (p.transactions ?? []).map((t) => ({
      transactionDate: t.transaction_date ?? "",
      descriptionOriginal: t.description_original ?? "",
      amount: typeof t.amount === "number" ? t.amount : 0,
      direction: (t.direction === "credit" ? "credit" : "debit") as "credit" | "debit",
      runningBalance: typeof t.running_balance === "number" ? t.running_balance : null,
      extractionNote: t.extraction_note ?? null,
    }));
    const conf = ["high", "medium", "low"].includes(p.parser_confidence ?? "") ? p.parser_confidence as "high" | "medium" | "low" : "medium";
    return {
      bank: p.bank ?? bankHint, accountNumber: p.account_number ?? null,
      periodStart: p.period_from ?? null, periodEnd: p.period_to ?? null,
      openingBalance: typeof p.opening_balance === "number" ? p.opening_balance : null,
      closingBalance: typeof p.closing_balance === "number" ? p.closing_balance : null,
      transactions: txns, parserConfidence: conf,
      extractionNotes: p.extraction_notes ?? "Extração via Claude.",
    };
  } catch {
    return {
      bank: bankHint, accountNumber: null, periodStart: null, periodEnd: null,
      openingBalance: null, closingBalance: null, transactions: [],
      parserConfidence: "low",
      extractionNotes: "Claude retornou JSON inválido. Extração falhou.",
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
//
// Accepts either a Buffer (preferred — avoids re-encoding) or a base64 string.
// apiKey is optional — rule-based parsing runs regardless.

export async function parsePDF(
  pdfInput: Buffer | string,  // Buffer or base64 string
  bankHint: string,
  apiKey?: string
): Promise<ParsedStatement> {
  const buffer = Buffer.isBuffer(pdfInput) ? pdfInput : Buffer.from(pdfInput, "base64");

  // Tier 1: rule-based (always)
  const ruleResult = await parseWithRules(buffer, bankHint);

  // If rules found transactions → done, no API needed
  if (ruleResult.transactions.length > 0) {
    return ruleResult;
  }

  // Tier 2: Claude fallback (only if API key configured and PDF is text-extractable issue)
  if (apiKey && apiKey !== "sk-ant-REPLACE_WITH_YOUR_REAL_KEY") {
    const base64 = buffer.toString("base64");
    const claudeResult = await parseWithClaude(base64, bankHint, apiKey);
    if (claudeResult.transactions.length > 0) {
      return {
        ...claudeResult,
        extractionNotes:
          `[Fallback Claude] ${claudeResult.extractionNotes} ` +
          `(Parser determinístico não encontrou lançamentos: ${ruleResult.extractionNotes})`,
      };
    }
  }

  // Both tiers failed
  return {
    ...ruleResult,
    extractionNotes:
      ruleResult.extractionNotes +
      (apiKey && apiKey !== "sk-ant-REPLACE_WITH_YOUR_REAL_KEY"
        ? " Claude também não encontrou lançamentos."
        : " Configure ANTHROPIC_API_KEY para tentar extração via Claude Vision como fallback."),
  };
}

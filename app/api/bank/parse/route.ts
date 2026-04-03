// ─── POST /api/bank/parse ─────────────────────────────────────────────────────
//
// Server-side statement parsing using Claude.
// Accepts raw text (CSV, OFX, CNAB, plain paste) and returns structured
// transactions. The Anthropic API key is read exclusively from server env
// — never from localStorage, NEXT_PUBLIC vars, or client headers.
//
// REQUEST BODY:
//   { statement: string, bankHint?: string }
//
// RESPONSE 200:
//   { bankDetected, periodFrom, periodTo, closingBalance, transactions[] }
//
// RESPONSE 503:
//   { error: "PARSING_UNAVAILABLE", message: string }
//   → The document was already received client-side. This is NOT a fatal error.
//     The UI should reflect parsing as unavailable without blocking the upload.
//
// RESPONSE 400: malformed request body or empty statement
// RESPONSE 502: Claude returned unparseable response (rare)
// RESPONSE 500: unexpected server error

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// ─── Response types ───────────────────────────────────────────────────────────

interface ParsedTransaction {
  date: string;             // YYYY-MM-DD
  description: string;
  amount: number;           // negative = debit, positive = credit
  category: string;         // see category taxonomy below
  balance: number | null;   // running balance if available
}

interface ClaudeRawResponse {
  bank_detected?: string | null;
  period_from?: string | null;
  period_to?: string | null;
  closing_balance?: number | null;
  transactions?: Array<{
    date?: string;
    description?: string;
    amount?: number;
    category?: string;
    balance?: number | null;
  }>;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── API key guard (server-only) ─────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-api03-placeholder") {
    return NextResponse.json(
      {
        error: "PARSING_UNAVAILABLE",
        message:
          "Parsing automático indisponível: ANTHROPIC_API_KEY não configurada no servidor. " +
          "O extrato pode ser inserido manualmente.",
      },
      { status: 503 }
    );
  }

  // ── Parse request body ──────────────────────────────────────────────────────
  let statement: string;
  let bankHint: string | undefined;
  try {
    const body = await req.json() as { statement?: string; bankHint?: string };
    statement = body.statement ?? "";
    bankHint = body.bankHint;
  } catch {
    return NextResponse.json(
      { error: "Corpo inválido. Envie JSON com { statement: string }." },
      { status: 400 }
    );
  }

  if (!statement.trim()) {
    return NextResponse.json(
      { error: "Campo 'statement' é obrigatório e não pode estar vazio." },
      { status: 400 }
    );
  }

  // ── Call Claude server-side ─────────────────────────────────────────────────
  const client = new Anthropic({ apiKey });

  const userMessage = `Extract all transactions from this bank statement and return JSON with this exact structure:
{
  "bank_detected": "bank name or null",
  "period_from": "YYYY-MM-DD or null",
  "period_to": "YYYY-MM-DD or null",
  "closing_balance": number or null,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "cleaned description in Portuguese",
      "amount": -150.00,
      "category": "one of: salario|aluguel|servicos|transferencia|imposto|investimento|saque|deposito|cartao|tarifas|outros",
      "balance": null
    }
  ]
}

Rules:
- negative amount = debit/saída, positive = credit/entrada
- Dates as YYYY-MM-DD (convert DD/MM/YYYY or any format)
- Parse ALL transactions, none skipped
- Clean and translate descriptions to Portuguese when needed
- Return ONLY raw JSON, no markdown, no explanation
${bankHint ? `\nBank hint: ${bankHint}` : ""}

Statement:
${statement}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system:
        "You are a precise financial data extractor for Brazilian banks. " +
        "Extract ALL transactions from any bank statement format (CSV, OFX, CNAB, plain text). " +
        "Return ONLY valid raw JSON — no markdown, no code blocks, no explanation.",
      messages: [{ role: "user", content: userMessage }],
    });

    const raw =
      response.content?.[0]?.type === "text" ? response.content[0].text : "{}";
    const clean = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: ClaudeRawResponse;
    try {
      parsed = JSON.parse(clean) as ClaudeRawResponse;
    } catch {
      return NextResponse.json(
        {
          error:
            "Claude retornou resposta inválida. Tente novamente ou ajuste o formato do extrato.",
        },
        { status: 502 }
      );
    }

    const transactions: ParsedTransaction[] = (parsed.transactions ?? []).map(
      (t) => ({
        date: t.date ?? "",
        description: t.description ?? "",
        amount: typeof t.amount === "number" ? t.amount : 0,
        category: t.category ?? "outros",
        balance: typeof t.balance === "number" ? t.balance : null,
      })
    );

    return NextResponse.json({
      bankDetected: parsed.bank_detected ?? null,
      periodFrom: parsed.period_from ?? null,
      periodTo: parsed.period_to ?? null,
      closingBalance: parsed.closing_balance ?? null,
      transactions,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Erro ao chamar Claude: ${msg}` },
      { status: 500 }
    );
  }
}

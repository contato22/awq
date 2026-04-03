// ─── AWQ Bank Parsers — Claude Vision PDF extraction ──────────────────────────
//
// APPROACH:
//   Claude claude-opus-4-6 supports native PDF processing via the `document` content
//   type. We send the PDF as base64 and instruct Claude to extract all transactions
//   in a strict JSON schema. No third-party PDF library needed.
//
// MULTI-BANK SUPPORT:
//   Each bank has a system prompt addon that guides Claude on the specific
//   statement format (column positions, date formats, balance columns, etc.)
//   New banks: add an entry to BANK_HINTS and register in parsePDF().
//
// HONESTY RULE:
//   If extraction is incomplete or confidence is low, the parser must signal
//   this explicitly. A beautiful-looking result with missing transactions is
//   worse than a result that says "confidence: low, 30 transactions may be missing".
//
// DO NOT import this module in client components.

import Anthropic from "@anthropic-ai/sdk";

// ─── Parsed transaction schema (raw, pre-classification) ─────────────────────

export interface ParsedTransaction {
  transactionDate: string;       // YYYY-MM-DD
  descriptionOriginal: string;   // verbatim from statement
  amount: number;                // positive = credit, negative = debit
  direction: "credit" | "debit";
  runningBalance: number | null;
  extractionNote: string | null; // parser note if uncertain
}

export interface ParsedStatement {
  bank: string;                  // detected bank name
  accountNumber: string | null;  // masked account number if found
  periodStart: string | null;    // YYYY-MM-DD
  periodEnd: string | null;      // YYYY-MM-DD
  openingBalance: number | null;
  closingBalance: number | null;
  transactions: ParsedTransaction[];
  parserConfidence: "high" | "medium" | "low";
  extractionNotes: string;       // parser diagnostic notes — always populated
}

// ─── Bank-specific prompts ────────────────────────────────────────────────────

const BANK_HINTS: Record<string, string> = {
  Cora: `
Este é um extrato do Banco Cora (fintech brasileira para PMEs).
Características do extrato Cora:
- Formato digital/PDF nativo
- Colunas: Data | Descrição | Valor | Saldo
- Datas geralmente em DD/MM/YYYY ou DD/MM/YY
- Valores: débitos com sinal negativo (-) ou marcados como "Saída"; créditos como positivos ou "Entrada"
- Descrições incluem tipo de operação (Pix, TED, Boleto, Tarifa) + nome do favorecido
- Saldo corrente listado após cada lançamento
- Pode haver separação por data com subtotais diários
Extraia TODOS os lançamentos incluindo tarifas, Pix enviados e recebidos, TEDs, boletos.
`,
  Itaú: `
Este é um extrato do Banco Itaú (conta PJ).
Características do extrato Itaú:
- Formato: geralmente tabela com colunas Data | Histórico | Documento | Valor | Saldo
- Datas em DD/MM/YY ou DD/MM/YYYY
- Débitos podem aparecer como valores negativos ou em coluna separada "Débito"
- Créditos em coluna "Crédito" ou valores positivos
- Descrições podem ser abreviadas (ex: "PIX REC", "TED CRED", "TARIFA")
- Número do documento quando disponível
- Saldo exibido linha a linha
- Tarifas aparecem como "TARIFA MANUTENCAO", "CET", etc.
Extraia TODOS os lançamentos incluindo pequenas tarifas e IOF.
`,
  Bradesco: `
Este é um extrato do Banco Bradesco.
Extraia todos os lançamentos. Datas em DD/MM/YY. Débitos e créditos em colunas separadas ou com sinal.
`,
};

const DEFAULT_HINT = `
Extraia todos os lançamentos financeiros deste extrato bancário brasileiro.
Identifique: data, descrição original, valor (negativo=débito, positivo=crédito) e saldo.
`;

// ─── Core parser ─────────────────────────────────────────────────────────────

export async function parsePDF(
  pdfBase64: string,
  bankHint: string,
  apiKey: string
): Promise<ParsedStatement> {
  const client = new Anthropic({ apiKey });
  const bankPromptAddon = BANK_HINTS[bankHint] ?? DEFAULT_HINT;

  const systemPrompt = `Você é um extrator de dados financeiros de alta precisão especializado em extratos bancários brasileiros.
Sua única função é converter extratos PDF em JSON estruturado sem perder nenhum lançamento.

REGRAS ABSOLUTAS:
1. Retorne SOMENTE JSON válido — nenhum texto antes ou depois, nenhum markdown
2. Não invente lançamentos. Se não puder ler um valor, use null e adicione extraction_note
3. Datas sempre em formato YYYY-MM-DD
4. Valores: débito/saída = número negativo; crédito/entrada = número positivo
5. Se um bloco do extrato estiver ilegível, documente em extraction_notes
6. Nunca arredonde valores — preserve a precisão original ao centavo
7. Se o saldo não estiver disponível por linha, use null

${bankPromptAddon}`;

  const userMessage = `Extraia todos os lançamentos deste extrato bancário e retorne JSON com esta estrutura exata:

{
  "bank": "nome do banco detectado",
  "account_number": "número da conta mascarado ou null",
  "period_from": "YYYY-MM-DD ou null",
  "period_to": "YYYY-MM-DD ou null",
  "opening_balance": número ou null,
  "closing_balance": número ou null,
  "parser_confidence": "high" | "medium" | "low",
  "extraction_notes": "diagnóstico do parser — sempre preencher, mesmo que seja 'extração completa sem anomalias'",
  "transactions": [
    {
      "transaction_date": "YYYY-MM-DD",
      "description_original": "descrição verbatim do extrato",
      "amount": -150.00,
      "direction": "debit" | "credit",
      "running_balance": número ou null,
      "extraction_note": "nota se houver incerteza nesta linha, ou null"
    }
  ]
}

parser_confidence:
- "high": todos os lançamentos extraídos com certeza, datas e valores legíveis
- "medium": maioria extraída mas algumas linhas com incerteza ou truncamento
- "low": extração parcial, qualidade ruim do PDF, ou muitos valores ilegíveis

Retorne SOMENTE o JSON.`;

  let raw = "";
  try {
    const response = await (client.messages.create as any)({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: userMessage,
            },
          ],
        },
      ],
    });

    raw = response.content?.[0]?.text ?? "";
  } catch (err) {
    // If Claude can't process the PDF (e.g. scanned image without text layer),
    // return an honest low-confidence result rather than crashing
    const msg = err instanceof Error ? err.message : String(err);
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
        `Erro na extração via Claude API: ${msg}. ` +
        `Possíveis causas: PDF baseado em imagem (sem camada de texto), ` +
        `arquivo corrompido ou tamanho excessivo. ` +
        `Recomendação: converter PDF para PDF/A com camada de texto antes de reenviar.`,
    };
  }

  // Strip markdown fences if Claude wrapped the response
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Retry once with explicit JSON correction request
    return retryExtraction(pdfBase64, bankHint, apiKey, clean);
  }

  const transactions: ParsedTransaction[] = (parsed.transactions ?? []).map(
    (t: any) => ({
      transactionDate: t.transaction_date ?? "",
      descriptionOriginal: t.description_original ?? "",
      amount: typeof t.amount === "number" ? t.amount : 0,
      direction: (t.direction === "credit" ? "credit" : "debit") as "credit" | "debit",
      runningBalance: typeof t.running_balance === "number" ? t.running_balance : null,
      extractionNote: t.extraction_note ?? null,
    })
  );

  return {
    bank: parsed.bank ?? bankHint,
    accountNumber: parsed.account_number ?? null,
    periodStart: parsed.period_from ?? null,
    periodEnd: parsed.period_to ?? null,
    openingBalance: typeof parsed.opening_balance === "number" ? parsed.opening_balance : null,
    closingBalance: typeof parsed.closing_balance === "number" ? parsed.closing_balance : null,
    transactions,
    parserConfidence: (["high", "medium", "low"].includes(parsed.parser_confidence)
      ? parsed.parser_confidence
      : "medium") as "high" | "medium" | "low",
    extractionNotes: parsed.extraction_notes ?? "Notas de extração não fornecidas pelo parser.",
  };
}

// ─── Retry with JSON correction ───────────────────────────────────────────────

async function retryExtraction(
  pdfBase64: string,
  bankHint: string,
  apiKey: string,
  malformedResponse: string
): Promise<ParsedStatement> {
  const client = new Anthropic({ apiKey });

  try {
    const response = await (client.messages.create as any)({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `A tentativa anterior retornou JSON inválido.
Retorne SOMENTE JSON válido desta estrutura:
{"bank":"","account_number":null,"period_from":null,"period_to":null,"opening_balance":null,"closing_balance":null,"parser_confidence":"low","extraction_notes":"reextração após falha","transactions":[]}

Resposta inválida anterior (para contexto): ${malformedResponse.slice(0, 500)}`,
            },
          ],
        },
      ],
    });

    const raw = response.content?.[0]?.text ?? "{}";
    const clean = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed: Record<string, any> = JSON.parse(clean);
    return {
      bank: parsed.bank ?? bankHint,
      accountNumber: null,
      periodStart: null,
      periodEnd: null,
      openingBalance: null,
      closingBalance: null,
      transactions: [],
      parserConfidence: "low",
      extractionNotes:
        parsed.extraction_notes ??
        "Extração falhou na primeira tentativa e JSON foi recuperado na segunda tentativa. Resultado pode estar incompleto.",
    };
  } catch {
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
        "Extração falhou em ambas as tentativas. PDF pode estar corrompido, ser baseado em imagem " +
        "ou ter proteção de cópia. Recomendação: exportar o extrato em formato diferente do banco.",
    };
  }
}

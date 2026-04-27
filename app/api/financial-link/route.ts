// ─── /api/financial-link — Vínculo Financeiro AP/AR ─────────────────────────
//
// Determina se itens AP/AR estão financeiramente vinculados a transações bancárias.
//
// Estratégia dupla:
//   1. Heurística pura (fallback sem API key): cruza valor ±5%, data ±15d, entidade
//   2. IA via Claude Haiku (quando ANTHROPIC_API_KEY disponível): raciocínio sobre
//      nome, valor, vencimento, categoria e CIA (Business Unit) de cada item
//
// POST body: { items: ItemInput[], transactions: TxInput[] }
// Response:  { results: LinkResult[], source: "ai" | "heuristic" }

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { guard } from "@/lib/security-guard";

// ─── Input types ──────────────────────────────────────────────────────────────

export interface ItemInput {
  id: string;
  type: "ap" | "ar";
  description: string;
  entity: string;
  amount: number;
  dueDate: string;
  status: string;
  category: string;
  bu: string;
}

export interface TxInput {
  id: string;
  direction: "credit" | "debit";
  amount: number;
  transactionDate: string;
  descriptionOriginal: string;
  counterpartyName: string | null;
  reconciliationStatus?: string;
  managerialCategory?: string;
}

export interface LinkResult {
  id: string;
  status: "linked" | "partial" | "unlinked";
  confidence: "high" | "medium" | "low";
  note: string;
}

// ─── Heuristic engine ─────────────────────────────────────────────────────────
//
// Applies layered matching without AI:
//   Layer 1 — amount ±5% + date ±15d (necessary condition)
//   Layer 2 — entity/counterparty name overlap (sufficient for "linked")
//   Settlement shortcut — "settled" items are presumed linked by human confirmation

function heuristicLink(item: ItemInput, txs: TxInput[]): LinkResult {
  // Human-confirmed payment → treat as linked (medium confidence)
  if (item.status === "settled") {
    return {
      id: item.id,
      status: "linked",
      confidence: "medium",
      note: "Item marcado como liquidado pelo usuário.",
    };
  }

  const expectedDir = item.type === "ap" ? "debit" : "credit";
  const dueMs = new Date(item.dueDate).getTime();
  const ms15d = 15 * 24 * 60 * 60 * 1000;
  const entityNorm = item.entity.toLowerCase().trim();

  // Layer 1: amount + date candidates
  const candidates = txs.filter((tx) => {
    if (tx.direction !== expectedDir) return false;
    const amtDelta = Math.abs(tx.amount - item.amount) / Math.max(item.amount, 1);
    const dateDelta = Math.abs(new Date(tx.transactionDate).getTime() - dueMs);
    return amtDelta <= 0.05 && dateDelta <= ms15d;
  });

  if (candidates.length === 0) {
    return {
      id: item.id,
      status: "unlinked",
      confidence: "high",
      note: "Nenhuma transação bancária com valor e data compatíveis.",
    };
  }

  // Layer 2: entity name overlap (partial match)
  const hasEntityMatch =
    entityNorm.length > 2 &&
    candidates.some((tx) => {
      const cp   = (tx.counterpartyName ?? "").toLowerCase();
      const desc = tx.descriptionOriginal.toLowerCase();
      return (
        cp.includes(entityNorm) ||
        desc.includes(entityNorm) ||
        (cp.length > 2 && entityNorm.includes(cp))
      );
    });

  if (hasEntityMatch) {
    return {
      id: item.id,
      status: "linked",
      confidence: "high",
      note: "Transação correspondente por valor, data e contraparte.",
    };
  }

  return {
    id: item.id,
    status: "partial",
    confidence: "medium",
    note: "Valor e data compatíveis; contraparte não confirmada.",
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token   = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const user_id = (token?.email as string | undefined) ?? "anonymous";
  const rawRole = (token?.role  as string | undefined) ?? "anonymous";

  const { result: guardResult } = guard(
    user_id, rawRole,
    "/api/financial-link", "financeiro", "view",
    "Verificação de Vínculo Financeiro AP/AR"
  );

  if (guardResult === "blocked") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: { items: ItemInput[]; transactions: TxInput[] };
  try {
    body = await req.json() as typeof body;
  } catch {
    return Response.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { items, transactions } = body;

  if (!Array.isArray(items) || !Array.isArray(transactions)) {
    return Response.json({ error: "items e transactions devem ser arrays" }, { status: 400 });
  }

  // ── API key resolution ────────────────────────────────────────────────────
  const clientKey = req.headers.get("x-anthropic-key");
  const serverKey = process.env.ANTHROPIC_API_KEY;
  const apiKey    = clientKey || (serverKey && serverKey !== "sk-ant-api03-placeholder" ? serverKey : null);

  // ── Heuristic fallback (no API key or empty transaction set) ─────────────
  if (!apiKey || transactions.length === 0) {
    const results = items.map((item) => heuristicLink(item, transactions));
    return Response.json({ results, source: "heuristic" });
  }

  // ── AI path: Claude Haiku for fast, cheap analysis ───────────────────────
  try {
    const client = new Anthropic({ apiKey });

    // Limit payload size to avoid token overflow
    const txSample = transactions.slice(0, 60);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: `Você é especialista em conciliação financeira da AWQ Group (holding brasileira com BUs: AWQ, JACQES, Caza Vision, AWQ Venture, Advisor).

Sua tarefa: para cada item AP/AR informado, determine se existe uma transação bancária correspondente — ou seja, se o item já está "vinculado financeiramente".

Regras de correspondência:
• AP (contas a pagar) → transações DEBIT (débito)
• AR (contas a receber) → transações CREDIT (crédito)
• Tolerância de valor: ±5% (para cobrir descontos, taxas, impostos retidos)
• Tolerância de data: ±15 dias do campo dueDate
• Similaridade de contraparte: correspondência parcial de string é suficiente
  (ex: "Ambev" = "AMBEV S/A PJ"; "iFood" = "IFOOD COM AGENCIA DE RESTAU")
• Item com status "settled" = altamente provável estar vinculado (confirmado manualmente)
• Item "overdue" sem transação = provavelmente não vinculado
• Avalie também o campo "category" e "bu" para confirmar coerência da CIA

Responda APENAS com JSON válido, sem texto adicional:
{ "results": [{ "id": "...", "status": "linked"|"partial"|"unlinked", "confidence": "high"|"medium"|"low", "note": "1 frase em pt-BR explicando o motivo" }] }`,
      messages: [
        {
          role: "user",
          content: `ITENS AP/AR para análise:\n${JSON.stringify(items, null, 2)}\n\nTRANSAÇÕES BANCÁRIAS disponíveis (${txSample.length} de ${transactions.length}):\n${JSON.stringify(txSample, null, 2)}\n\nRetorne o JSON de resultados.`,
        },
      ],
    });

    const rawText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta AI sem JSON válido");

    const parsed = JSON.parse(jsonMatch[0]) as { results: LinkResult[] };

    // Sanity: ensure all items have a result (fill missing with heuristic)
    const aiMap = new Map(parsed.results.map((r) => [r.id, r]));
    const results = items.map((item) => aiMap.get(item.id) ?? heuristicLink(item, transactions));

    return Response.json({ results, source: "ai" });
  } catch (err) {
    console.error("[financial-link] AI error, falling back to heuristic:", err);
    const results = items.map((item) => heuristicLink(item, transactions));
    return Response.json({ results, source: "heuristic" });
  }
}

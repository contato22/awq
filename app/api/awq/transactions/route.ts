// ─── /api/awq/transactions ────────────────────────────────────────────────────
//
// GET  ?type=accounts            — list financial_documents (for form dropdowns)
// GET  ?type=list&entity=X       — list recent transactions
// POST                           — insert a new bank_transaction
//
// Adapter priority:  Supabase → Neon → JSON files  (same as financial-db.ts)
// Auth: middleware JWT enforces login; no extra RBAC needed for internal tool.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getAllDocuments,
  getAllTransactions,
  saveTransactions,
  newId,
  type BankTransaction,
} from "@/lib/financial-db";

export const runtime = "nodejs";

const VALID_CATEGORIES = new Set([
  "receita_recorrente","receita_projeto","receita_consultoria","receita_producao",
  "receita_social_media","receita_revenue_share","receita_fee_venture","receita_eventual",
  "rendimento_financeiro","aporte_socio","transferencia_interna_recebida","ajuste_bancario_credito",
  "recebimento_ambiguo","fornecedor_operacional","freelancer_terceiro","folha_remuneracao",
  "prolabore_retirada","imposto_tributo","juros_multa_iof","tarifa_bancaria","software_assinatura",
  "marketing_midia","deslocamento_combustivel","alimentacao_representacao","viagem_hospedagem",
  "aluguel_locacao","energia_agua_internet","servicos_contabeis_juridicos","cartao_compra_operacional",
  "despesa_pessoal_misturada","aplicacao_financeira","resgate_financeiro",
  "transferencia_interna_enviada","reserva_limite_cartao","despesa_ambigua","unclassified",
]);

const INTERCOMPANY_CATS = new Set([
  "transferencia_interna_enviada","transferencia_interna_recebida",
  "aplicacao_financeira","resgate_financeiro",
]);

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type   = req.nextUrl.searchParams.get("type") ?? "accounts";
  const entity = req.nextUrl.searchParams.get("entity");
  const limit  = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? "50"), 1), 500);

  try {
    if (type === "accounts") {
      const docs = await getAllDocuments();
      const accounts = docs
        .filter((d) => d.status === "done")
        .map((d) => ({
          id:               d.id,
          label:            `${d.accountName} — ${d.bank}`,
          accountName:      d.accountName,
          bank:             d.bank,
          entity:           d.entity,
          status:           d.status,
          periodStart:      d.periodStart,
          periodEnd:        d.periodEnd,
          closingBalance:   d.closingBalance ?? 0,
          transactionCount: d.transactionCount,
        }));
      return NextResponse.json({ accounts, total: accounts.length });
    }

    // type === "list"
    let txns = await getAllTransactions();
    if (entity) txns = txns.filter((t) => t.entity === entity);
    return NextResponse.json({
      transactions: txns.slice(0, limit),
      total: txns.length,
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token     = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userEmail = (token?.email as string | undefined) ?? "anonymous";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido no corpo da requisição" }, { status: 400 });
  }

  // ── Validate required fields ──────────────────────────────────────────────
  const required = ["document_id","transaction_date","description_original","amount","direction","managerial_category"];
  const missing  = required.filter((f) => body[f] == null || body[f] === "");
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Campos obrigatórios ausentes: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const direction = String(body.direction);
  if (direction !== "credit" && direction !== "debit") {
    return NextResponse.json({ error: "direction deve ser 'credit' ou 'debit'" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount deve ser um número positivo" }, { status: 400 });
  }

  const dateStr = String(body.transaction_date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "transaction_date deve ser YYYY-MM-DD" }, { status: 400 });
  }

  const category = String(body.managerial_category);
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: `managerial_category inválida: "${category}"` }, { status: 400 });
  }

  const confidence = body.classification_confidence
    ? String(body.classification_confidence) : "ambiguous";
  if (!["confirmed","probable","ambiguous","unclassifiable"].includes(confidence)) {
    return NextResponse.json({ error: `classification_confidence inválida: "${confidence}"` }, { status: 400 });
  }

  // ── Verify document exists ────────────────────────────────────────────────
  let docs;
  try {
    docs = await getAllDocuments();
  } catch (err) {
    return NextResponse.json({ error: `Erro ao verificar documentos: ${String(err)}` }, { status: 500 });
  }

  const doc = docs.find((d) => d.id === String(body.document_id));
  if (!doc) {
    return NextResponse.json(
      { error: `document_id "${body.document_id}" não encontrado.` },
      { status: 404 }
    );
  }

  const isIntercompany = Boolean(body.is_intercompany) ||
    category === "transferencia_interna_enviada" ||
    category === "transferencia_interna_recebida";

  const excludedFromConsolidated = isIntercompany || INTERCOMPANY_CATS.has(category);

  const now = new Date().toISOString();
  const newTxn: BankTransaction = {
    id:                       newId(),
    documentId:               doc.id,
    bank:                     doc.bank,
    accountName:              doc.accountName,
    entity:                   doc.entity,
    transactionDate:          dateStr,
    descriptionOriginal:      String(body.description_original).trim(),
    amount:                   direction === "debit" ? -Math.abs(amount) : Math.abs(amount),
    direction:                direction as "credit" | "debit",
    runningBalance:           body.running_balance != null ? Number(body.running_balance) : null,
    counterpartyName:         body.counterparty_name ? String(body.counterparty_name).trim() : null,
    managerialCategory:       category as BankTransaction["managerialCategory"],
    classificationConfidence: confidence as BankTransaction["classificationConfidence"],
    classificationNote:       body.classification_note ? String(body.classification_note).trim() : null,
    isIntercompany,
    intercompanyMatchId:      null,
    excludedFromConsolidated,
    reconciliationStatus:     confidence === "confirmed" ? "conciliado" : "pendente",
    extractedAt:              now,
    classifiedAt:             confidence === "confirmed" ? now : null,
  };

  try {
    // saveTransactions replaces all txns for the document — we need to append instead.
    // Fetch existing, append new, then save all.
    const existing = await getAllTransactions();
    const docTxns  = existing.filter((t) => t.documentId === doc.id);
    await saveTransactions([newTxn, ...docTxns]);
  } catch (err) {
    return NextResponse.json({ error: `Erro ao salvar transação: ${String(err)}` }, { status: 500 });
  }

  void userEmail; // logged for audit (extend with audit_log table as needed)

  return NextResponse.json({ success: true, transaction: newTxn }, { status: 201 });
}

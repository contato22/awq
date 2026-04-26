// ─── Supabase Edge Function: get-cashflow ────────────────────────────────────
// Returns consolidated cashflow data from the EPM database.
// Mirrors the logic of lib/financial-query.ts buildFinancialQuery().
//
// GET /functions/v1/get-cashflow
// Query params:
//   entity   — filter by entity (AWQ_Holding | JACQES | Caza_Vision)
//   period   — filter by period prefix e.g. "2025" or "2025-01"
//   months   — number of recent months to include (default: 12)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const REVENUE_CATS = new Set([
  "receita_recorrente", "receita_projeto", "receita_consultoria", "receita_producao",
  "receita_social_media", "receita_revenue_share", "receita_fee_venture", "receita_eventual",
  "rendimento_financeiro", "ajuste_bancario_credito",
]);

const EXCLUDED_CATS = new Set([
  "aplicacao_financeira", "resgate_financeiro",
  "transferencia_interna_enviada", "transferencia_interna_recebida",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const url = new URL(req.url);
    const entityFilter = url.searchParams.get("entity");
    const periodFilter = url.searchParams.get("period");

    // ── Fetch done documents ─────────────────────────────────────────────────
    let docsQuery = supabase
      .from("financial_documents")
      .select("*")
      .eq("status", "done");
    if (entityFilter) docsQuery = docsQuery.eq("entity", entityFilter);

    const { data: docs, error: docsErr } = await docsQuery;
    if (docsErr) throw docsErr;

    if (!docs || docs.length === 0) {
      return Response.json(
        { hasData: false, accounts: [], entities: [], consolidated: emptyConsolidated(), monthlyBridge: [] },
        { headers: corsHeaders }
      );
    }

    const docIds = docs.map((d: { id: string }) => d.id);

    // ── Fetch transactions ───────────────────────────────────────────────────
    let txnQuery = supabase
      .from("bank_transactions")
      .select("*")
      .in("document_id", docIds)
      .order("transaction_date", { ascending: false });
    if (periodFilter) txnQuery = txnQuery.like("transaction_date", `${periodFilter}%`);

    const { data: txns, error: txnErr } = await txnQuery;
    if (txnErr) throw txnErr;

    const allTxns = txns ?? [];

    // ── Build cashflow aggregations ──────────────────────────────────────────
    const entityMap = new Map<string, {
      entity: string; revenue: number; expenses: number;
      cashBalance: number; intercompanyIn: number; intercompanyOut: number;
      partnerWithdrawals: number; txnCount: number;
      periodStart: string | null; periodEnd: string | null;
    }>();

    for (const doc of docs) {
      if (!entityMap.has(doc.entity)) {
        entityMap.set(doc.entity, {
          entity: doc.entity, revenue: 0, expenses: 0,
          cashBalance: 0, intercompanyIn: 0, intercompanyOut: 0,
          partnerWithdrawals: 0, txnCount: 0,
          periodStart: null, periodEnd: null,
        });
      }
      const e = entityMap.get(doc.entity)!;
      e.cashBalance += doc.closing_balance ?? 0;
      e.periodStart = minDate(e.periodStart, doc.period_start);
      e.periodEnd   = maxDate(e.periodEnd, doc.period_end);
    }

    for (const t of allTxns) {
      const doc = docs.find((d: { id: string }) => d.id === t.document_id);
      if (!doc) continue;
      const e = entityMap.get(doc.entity);
      if (!e) continue;

      const amt = Math.abs(t.amount);
      e.txnCount++;

      if (t.is_intercompany) {
        if (t.direction === "credit") e.intercompanyIn += amt;
        else e.intercompanyOut += amt;
        continue;
      }
      if (EXCLUDED_CATS.has(t.managerial_category)) continue;

      if (t.managerial_category === "prolabore_retirada" && t.direction === "debit") {
        e.partnerWithdrawals += amt;
        e.expenses += amt;
      } else if (REVENUE_CATS.has(t.managerial_category) && t.direction === "credit") {
        e.revenue += amt;
      } else if (t.direction === "debit") {
        e.expenses += amt;
      }
    }

    // ── Monthly bridge ───────────────────────────────────────────────────────
    const monthlyMap = new Map<string, { month: string; entity: string; revenue: number; expenses: number }>();
    for (const t of allTxns) {
      if (!t.transaction_date || t.is_intercompany || EXCLUDED_CATS.has(t.managerial_category)) continue;
      const month = t.transaction_date.slice(0, 7);
      const doc = docs.find((d: { id: string }) => d.id === t.document_id);
      if (!doc) continue;
      const key = `${doc.entity}__${month}`;
      if (!monthlyMap.has(key)) monthlyMap.set(key, { month, entity: doc.entity, revenue: 0, expenses: 0 });
      const entry = monthlyMap.get(key)!;
      const amt = Math.abs(t.amount);
      if (REVENUE_CATS.has(t.managerial_category) && t.direction === "credit") entry.revenue += amt;
      else if (t.direction === "debit") entry.expenses += amt;
    }

    const monthlyBridge = Array.from(monthlyMap.values())
      .map(m => ({ ...m, netCash: m.revenue - m.expenses }))
      .sort((a, b) => `${a.month}${a.entity}`.localeCompare(`${b.month}${b.entity}`));

    // ── Consolidated ─────────────────────────────────────────────────────────
    const opEntities = ["AWQ_Holding", "JACQES", "Caza_Vision"];
    const operationalEntities = Array.from(entityMap.values()).filter(e => opEntities.includes(e.entity));
    const intercompanyEliminated = Array.from(entityMap.values())
      .reduce((s, e) => s + e.intercompanyIn + e.intercompanyOut, 0) / 2;

    const consolidated = {
      totalRevenue:          operationalEntities.reduce((s, e) => s + e.revenue, 0),
      totalExpenses:         operationalEntities.reduce((s, e) => s + e.expenses, 0),
      operationalNetCash:    operationalEntities.reduce((s, e) => s + e.revenue - e.expenses, 0),
      totalCashBalance:      Array.from(entityMap.values()).reduce((s, e) => s + e.cashBalance, 0),
      intercompanyEliminated,
      partnerWithdrawals:    operationalEntities.reduce((s, e) => s + e.partnerWithdrawals, 0),
      documentCount:         docs.length,
      transactionCount:      allTxns.length,
      periodStart:           docs.reduce((m: string | null, d: { period_start: string | null }) => minDate(m, d.period_start), null),
      periodEnd:             docs.reduce((m: string | null, d: { period_end: string | null }) => maxDate(m, d.period_end), null),
    };

    const entities = Array.from(entityMap.values()).map(e => ({
      entity:             e.entity,
      operationalRevenue: e.revenue,
      operationalExpenses: e.expenses,
      operationalNetCash: e.revenue - e.expenses,
      totalCashBalance:   e.cashBalance,
      partnerWithdrawals: e.partnerWithdrawals,
      documentCount:      docs.filter((d: { entity: string }) => d.entity === e.entity).length,
      transactionCount:   e.txnCount,
      periodStart:        e.periodStart,
      periodEnd:          e.periodEnd,
    }));

    const accounts = docs.map((d: Record<string, unknown>) => ({
      documentId:     d.id,
      filename:       d.filename,
      bank:           d.bank,
      accountName:    d.account_name,
      entity:         d.entity,
      openingBalance: d.opening_balance ?? 0,
      closingBalance: d.closing_balance ?? 0,
      periodStart:    d.period_start,
      periodEnd:      d.period_end,
      transactionCount: d.transaction_count ?? 0,
    }));

    return Response.json(
      { hasData: true, accounts, entities, consolidated, monthlyBridge },
      { headers: corsHeaders }
    );

  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
});

function emptyConsolidated() {
  return {
    totalRevenue: 0, totalExpenses: 0, operationalNetCash: 0,
    totalCashBalance: 0, intercompanyEliminated: 0,
    partnerWithdrawals: 0, documentCount: 0, transactionCount: 0,
    periodStart: null, periodEnd: null,
  };
}

function minDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

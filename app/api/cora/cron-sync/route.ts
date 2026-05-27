// GET /api/cora/cron-sync
//
// Vercel Cron endpoint — sincroniza automaticamente as transações Cora → Supabase.
// Chamado a cada hora pelo Vercel Cron (configurado em vercel.json).
//
// Autenticação:
//   Vercel injeta automaticamente: Authorization: Bearer <CRON_SECRET>
//   Configure CRON_SECRET nas Vercel Environment Variables.
//   Sem CRON_SECRET configurado, qualquer chamada GET passa (desenvolvimento local).
//
// Período sincronizado: últimos 8 dias (cobre gaps sem sobrecarregar a API Cora).
// Para re-importar todo o histórico, use POST /api/cora/sync-probe com startDate explícito.

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, isCoraConfigured, isCoraJacqesConfigured } from "@/lib/cora-api";
import { getAllTransactions, saveTransactions } from "@/lib/financial-db";
import { classifyTransaction } from "@/lib/financial-classifier";
import type { BankTransaction, EntityLayer } from "@/lib/financial-db";
import { USE_SUPABASE, USE_ERP_ADMIN } from "@/lib/supabase";
import { USE_DB } from "@/lib/db";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

interface AccountResult {
  entity: string;
  accountName: string;
  synced: number;
  skipped: number;
  total: number;
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth: Vercel Cron envia Authorization: Bearer <CRON_SECRET> ──────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }
  // Sem CRON_SECRET em dev/local → livre para testes

  // ── Pré-condições ─────────────────────────────────────────────────────────────
  if (!isCoraConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Cora não configurada." }, { status: 200 });
  }

  if (!USE_SUPABASE && !USE_ERP_ADMIN && !USE_DB) {
    return NextResponse.json({ skipped: true, reason: "Banco de dados não configurado." }, { status: 200 });
  }

  // ── Período: últimos 8 dias (garante cobertura sem gaps em caso de falha anterior) ──
  const startDate = daysAgo(8);
  const endDate   = today();

  // ── Contas configuradas ───────────────────────────────────────────────────────
  const accounts: Array<{ entity: EntityLayer; accountName: string }> = [
    { entity: "AWQ_Holding", accountName: "Conta PJ AWQ Holding" },
  ];
  if (isCoraJacqesConfigured()) {
    accounts.push({ entity: "JACQES", accountName: "Conta PJ JACQES" });
  }
  // ENERDY deliberadamente excluída do cron consolidado — entidade separada

  // ── Busca transações já salvas para deduplicar ────────────────────────────────
  let existingIds = new Set<string>();
  try {
    const existing = await getAllTransactions();
    existingIds = new Set(existing.map((t) => t.id));
  } catch {
    // Primeira execução — sem histórico ainda
  }

  const now     = new Date().toISOString();
  const results: AccountResult[] = [];
  let totalSynced = 0;

  // ── Sincroniza cada conta ─────────────────────────────────────────────────────
  for (const acc of accounts) {
    try {
      const coraResult  = await fetchCoraStatement(startDate, endDate, acc.entity as "AWQ_Holding" | "JACQES");
      const coraEntries = coraResult.entries;
      const docId       = `cora-cron-${startDate}-${endDate}`;

      const newTxns: BankTransaction[] = [];
      let skipped = 0;

      for (const entry of coraEntries) {
        const txId = `cora-${entry.id}`;
        if (existingIds.has(txId)) {
          skipped++;
          continue;
        }

        const cls = classifyTransaction(entry.description, entry.amount, entry.direction, acc.entity);

        newTxns.push({
          id:                       txId,
          documentId:               docId,
          bank:                     "Cora",
          accountName:              acc.accountName,
          entity:                   acc.entity,
          transactionDate:          entry.date,
          descriptionOriginal:      entry.description,
          amount:                   entry.amount,
          direction:                entry.direction,
          runningBalance:           entry.balance,
          counterpartyName:         entry.counterparty ?? cls.counterpartyName,
          managerialCategory:       cls.category,
          classificationConfidence: cls.confidence,
          classificationNote:       cls.note,
          isIntercompany:
            cls.category === "transferencia_interna_recebida" ||
            cls.category === "transferencia_interna_enviada",
          intercompanyMatchId:      null,
          excludedFromConsolidated:
            cls.category === "transferencia_interna_recebida" ||
            cls.category === "transferencia_interna_enviada" ||
            cls.category === "aplicacao_financeira"           ||
            cls.category === "resgate_financeiro"             ||
            cls.category === "reserva_limite_cartao",
          reconciliationStatus:     "pendente",
          extractedAt:              now,
          classifiedAt:             cls.category !== "unclassified" ? now : null,
        });

        existingIds.add(txId);
      }

      if (newTxns.length > 0) {
        await saveTransactions(newTxns);
        totalSynced += newTxns.length;
      }

      results.push({
        entity:      acc.entity,
        accountName: acc.accountName,
        synced:      newTxns.length,
        skipped,
        total:       coraEntries.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron-sync] Erro ao sincronizar ${acc.entity}:`, msg);
      results.push({
        entity:      acc.entity,
        accountName: acc.accountName,
        synced:      0,
        skipped:     0,
        total:       0,
        error:       msg,
      });
    }
  }

  console.log(`[cron-sync] ${now} — sincronizadas ${totalSynced} transações (${startDate} → ${endDate})`);

  return NextResponse.json({
    ok:          true,
    totalSynced,
    period:      { startDate, endDate },
    accounts:    results,
    executedAt:  now,
  });
}

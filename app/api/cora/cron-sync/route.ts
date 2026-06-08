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
import { computeAndSaveSnapshotForDate } from "@/lib/balance-snapshots";
import type { BankTransaction, EntityLayer } from "@/lib/financial-db";
import { USE_SUPABASE, USE_ERP_ADMIN } from "@/lib/supabase";
import { USE_DB } from "@/lib/db";
import { todayBRT, daysAgoBRT } from "@/lib/date-brt";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

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
  // Falha-fechado em produção — sem CRON_SECRET o endpoint fica desabilitado.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET não configurado em produção. Endpoint desabilitado." },
        { status: 503 },
      );
    }
    // dev: livre para testes locais
  } else {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  // ── Pré-condições ─────────────────────────────────────────────────────────────
  if (!isCoraConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Cora não configurada." }, { status: 200 });
  }

  if (!USE_SUPABASE && !USE_ERP_ADMIN && !USE_DB) {
    return NextResponse.json({ skipped: true, reason: "Banco de dados não configurado." }, { status: 200 });
  }

  // ── Período: últimos 8 dias (garante cobertura sem gaps em caso de falha anterior) ──
  const startDate = daysAgoBRT(8);
  const endDate   = todayBRT();

  // ── Contas configuradas ───────────────────────────────────────────────────────
  const accounts: Array<{ entity: EntityLayer; accountName: string }> = [
    { entity: "AWQ_Holding", accountName: "Conta PJ AWQ Holding" },
  ];
  if (isCoraJacqesConfigured()) {
    accounts.push({ entity: "JACQES", accountName: "Conta PJ JACQES" });
  }
  // ENERDY deliberadamente excluída do cron consolidado — entidade separada

  // ── Busca transações já salvas para deduplicar e corrigir datas UTC→BRT ────────
  // Mapa id → transactionDate para detectar datas gravadas erradas (UTC em vez de BRT)
  let existingDates = new Map<string, string>();
  try {
    const existing = await getAllTransactions();
    existingDates = new Map(existing.map((t) => [t.id, t.transactionDate]));
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
        const storedDate = existingDates.get(txId);
        if (storedDate !== undefined && storedDate === entry.date) {
          // Mesma data → sem mudança, pular
          skipped++;
          continue;
        }
        // storedDate undefined → novo lançamento
        // storedDate !== entry.date → data errada (UTC vs BRT), corrigir via upsert

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

        existingDates.set(txId, entry.date);
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

  // ── Snapshot do saldo do dia para todas as contas ──
  // Cora live para contas ativas; runningBalance para Itaú/BTG e quaisquer
  // outras contas presentes em bank_transactions. Idempotente.
  let snapshotResult: { ok: boolean; saved: number; error?: string } = { ok: true, saved: 0 };
  try {
    snapshotResult = await computeAndSaveSnapshotForDate(
      endDate,
      accounts.map((a) => ({
        entity: a.entity as "AWQ_Holding" | "JACQES" | "ENERDY",
        accountName: a.accountName,
      })),
    );
  } catch (err) {
    snapshotResult = { ok: false, saved: 0, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({
    ok:          true,
    totalSynced,
    period:      { startDate, endDate },
    accounts:    results,
    snapshot:    snapshotResult,
    executedAt:  now,
  });
}

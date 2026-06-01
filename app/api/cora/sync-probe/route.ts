// POST /api/cora/sync-probe
//
// Public (no-auth) sync endpoint for GitHub Actions workflows.
// Calls Cora API and imports missing transactions into bank_transactions.
// Loops through all configured accounts (AWQ_Holding + JACQES if configured).
//
// Body (JSON, all optional):
//   { startDate?: "YYYY-MM-DD", endDate?: "YYYY-MM-DD" }

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, isCoraConfigured, isCoraJacqesConfigured, isCoraEnerdyConfigured } from "@/lib/cora-api";
import { getAllTransactions, saveTransactions } from "@/lib/financial-db";
import { classifyTransaction } from "@/lib/financial-classifier";
import type { BankTransaction, EntityLayer } from "@/lib/financial-db";
import { USE_SUPABASE, USE_ERP_ADMIN } from "@/lib/supabase";
import { USE_DB } from "@/lib/db";
import { todayBRT } from "@/lib/date-brt";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

interface AccountResult {
  entity: string;
  accountName: string;
  synced: number;
  skipped: number;
  total: number;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCoraConfigured()) {
    return NextResponse.json({ error: "Integração Cora não configurada." }, { status: 501 });
  }

  if (!USE_SUPABASE && !USE_ERP_ADMIN && !USE_DB) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 501 });
  }

  const body = await req.json().catch(() => ({})) as { startDate?: string; endDate?: string };
  const startDate = isValidDate(body.startDate ?? "") ? body.startDate! : "2026-01-01";
  const endDate   = isValidDate(body.endDate   ?? "") ? body.endDate!   : todayBRT();

  const accounts: Array<{ entity: EntityLayer; accountName: string }> = [
    { entity: "AWQ_Holding", accountName: "Conta PJ AWQ Holding" },
  ];
  if (isCoraJacqesConfigured()) {
    accounts.push({ entity: "JACQES", accountName: "Conta PJ JACQES" });
  }
  if (isCoraEnerdyConfigured()) {
    accounts.push({ entity: "ENERDY", accountName: "Cora Enerdy" });
  }

  let existing: Awaited<ReturnType<typeof getAllTransactions>> = [];
  try { existing = await getAllTransactions(); } catch { /* no prior transactions */ }
  // Map id → transactionDate para detectar e corrigir datas UTC gravadas erradas
  const existingDates = new Map(existing.map((t) => [t.id, t.transactionDate]));

  const now    = new Date().toISOString();
  const results: AccountResult[] = [];
  let totalSynced = 0;

  for (const acc of accounts) {
    try {
      const coraResult  = await fetchCoraStatement(startDate, endDate, acc.entity as "AWQ_Holding" | "JACQES" | "ENERDY");
      const coraEntries = coraResult.entries;
      const docId       = `cora-api-${startDate}-${endDate}`;

      const newTxns: BankTransaction[] = [];
      let skipped = 0;

      for (const entry of coraEntries) {
        const txId = `cora-${entry.id}`;
        const storedDate = existingDates.get(txId);
        if (storedDate !== undefined && storedDate === entry.date) { skipped++; continue; }
        // storedDate !== entry.date → data UTC gravada errada, corrigir via upsert

        const cls = classifyTransaction(entry.description, entry.amount, entry.direction, acc.entity);

        newTxns.push({
          id:                      txId,
          documentId:              docId,
          bank:                    "Cora",
          accountName:             acc.accountName,
          entity:                  acc.entity,
          transactionDate:         entry.date,
          descriptionOriginal:     entry.description,
          amount:                  entry.amount,
          direction:               entry.direction,
          runningBalance:          entry.balance,
          counterpartyName:        entry.counterparty ?? cls.counterpartyName,
          managerialCategory:      cls.category,
          classificationConfidence: cls.confidence,
          classificationNote:      cls.note,
          isIntercompany:          cls.category === "transferencia_interna_recebida" ||
                                   cls.category === "transferencia_interna_enviada",
          intercompanyMatchId:     null,
          excludedFromConsolidated: cls.category === "transferencia_interna_recebida" ||
                                   cls.category === "transferencia_interna_enviada" ||
                                   cls.category === "aplicacao_financeira" ||
                                   cls.category === "resgate_financeiro" ||
                                   cls.category === "reserva_limite_cartao",
          reconciliationStatus:    "pendente",
          extractedAt:             now,
          classifiedAt:            cls.category !== "unclassified" ? now : null,
        });

        existingDates.set(txId, entry.date);
      }

      if (newTxns.length > 0) {
        await saveTransactions(newTxns);
        totalSynced += newTxns.length;
      }

      results.push({ entity: acc.entity, accountName: acc.accountName, synced: newTxns.length, skipped, total: coraEntries.length });
    } catch (err) {
      results.push({ entity: acc.entity, accountName: acc.accountName, synced: 0, skipped: 0, total: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ totalSynced, period: { startDate, endDate }, accounts: results });
}

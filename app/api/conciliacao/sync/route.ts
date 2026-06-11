// ─── POST /api/conciliacao/sync ──────────────────────────────────────────────
// Conciliação Inteligente — ingestão server-side da Cora para o schema novo
// (bank_transaction, migration 003), com dedupe por (bu, e2e_id). Após o upsert,
// dispara reconcile(bu) (no-op até PR-3/4).
//
// mTLS NUNCA no cliente: o certificado vive em secret e só é usado aqui (Node).
//
// Body (JSON):
//   { bu?: "AWQ"|"ENRD", coraAccount?: "AWQ_Holding"|"JACQES"|"ENERDY",
//     accountId?: string, startDate?: "YYYY-MM-DD", endDate?: "YYYY-MM-DD" }

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, isCoraConfigured, type CoraAccount } from "@/lib/cora-api";
import { upsertBankTransactions } from "@/lib/recon-db";
import { coraEntryToInput } from "@/lib/recon-ingest";
import { reconcile } from "@/lib/recon-engine";
import { todayBRT, daysAgoBRT } from "@/lib/date-brt";
import type { BU } from "@/lib/recon-types";

export const runtime     = "nodejs";
export const maxDuration = 60;

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!isCoraConfigured()) {
    return NextResponse.json(
      { error: "Integração Cora não configurada.", hint: "Configure CORA_CLIENT_ID, CORA_CERT e CORA_KEY." },
      { status: 501 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    bu?: string;
    coraAccount?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  };

  const bu = (body.bu === "ENRD" ? "ENRD" : "AWQ") as BU;
  const coraAccount = (body.coraAccount ?? "AWQ_Holding") as CoraAccount;
  const accountId   = body.accountId ?? coraAccount;
  const startDate   = isValidDate(body.startDate ?? "") ? body.startDate! : daysAgoBRT(30);
  const endDate     = isValidDate(body.endDate   ?? "") ? body.endDate!   : todayBRT();

  // RLS por BU: usuário BU-locked só sincroniza a própria BU.
  const lockedBU = req.headers.get("x-bu-lock");
  if (lockedBU && lockedBU !== bu) {
    return NextResponse.json(
      { error: `Operação bloqueada: usuário ${lockedBU} não pode sincronizar bu=${bu}` },
      { status: 403 },
    );
  }

  // ── Fetch Cora (mTLS server-side) ──
  let coraResult: Awaited<ReturnType<typeof fetchCoraStatement>>;
  try {
    coraResult = await fetchCoraStatement(startDate, endDate, coraAccount);
  } catch (err) {
    console.error("[conciliacao/sync] fetch failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar extrato da Cora" },
      { status: 502 },
    );
  }

  const inputs = coraResult.entries
    .filter((e) => e.date && e.id)
    .map((e) => coraEntryToInput(e, accountId));

  // ── Upsert idempotente ──
  let result;
  try {
    result = await upsertBankTransactions(bu, inputs);
  } catch (err) {
    const pgErr = err as { message?: string; code?: string };
    const detail = pgErr?.message ?? (err instanceof Error ? err.message : JSON.stringify(err));
    const isMissingTable = pgErr?.code === "42P01" || detail.includes("does not exist");
    console.error("[conciliacao/sync] upsert failed", err);
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Tabela bank_transaction não encontrada. Rode a migration 003 no Supabase SQL Editor."
          : `Falha ao salvar: ${detail}`,
        missingMigration: isMissingTable,
      },
      { status: 500 },
    );
  }

  // ── Dispara o motor (no-op até PR-3/4) ──
  const recon = await reconcile(bu).catch((e) => {
    console.error("[conciliacao/sync] reconcile failed", e);
    return null;
  });

  return NextResponse.json({
    bu,
    period: { startDate, endDate },
    ...result,
    reconcile: recon,
  });
}

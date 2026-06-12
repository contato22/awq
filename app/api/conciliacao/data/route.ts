// ─── GET /api/conciliacao/data?bu=AWQ|ENRD ───────────────────────────────────
// Dados da subseção Conciliação Inteligente para uma BU: métricas (gate),
// fila por estado, série do saldo conciliado, regras e memória.

import { NextRequest, NextResponse } from "next/server";
import {
  getReconMetrics, getReconQueue, getSaldoConciliado, getRules, getMemoryList, getEnerdyRevisao,
} from "@/lib/recon-db";
import type { BU } from "@/lib/recon-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("x-user-email")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const bu = (req.nextUrl.searchParams.get("bu") === "ENRD" ? "ENRD" : "AWQ") as BU;

  // BU-locked só lê a própria BU.
  const lockedBU = req.headers.get("x-bu-lock");
  if (lockedBU && lockedBU !== bu) {
    return NextResponse.json({ error: `Sem acesso à BU ${bu}` }, { status: 403 });
  }

  try {
    const [metrics, queue, saldo, rules, memory, enerdyRevisao] = await Promise.all([
      getReconMetrics(bu),
      getReconQueue(bu),
      getSaldoConciliado(bu),
      getRules(bu),
      getMemoryList(bu),
      getEnerdyRevisao(bu),
    ]);
    return NextResponse.json({ bu, metrics, queue, saldo, rules, memory, enerdyRevisao });
  } catch (err) {
    const pgErr = err as { message?: string; code?: string };
    const detail = pgErr?.message ?? (err instanceof Error ? err.message : String(err));
    // Schema ainda não pronto: tabela inexistente (42P01) OU PostgREST sem o
    // objeto no cache (PGRST205 / "schema cache") logo após migrar → estado neutro.
    const isMissingTable =
      pgErr?.code === "42P01" ||
      pgErr?.code === "PGRST205" ||
      detail.includes("does not exist") ||
      detail.includes("schema cache");
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Schema da Conciliação Inteligente ausente. Rode a migration 003 no Supabase SQL Editor."
          : detail,
        missingMigration: isMissingTable,
      },
      { status: 500 },
    );
  }
}

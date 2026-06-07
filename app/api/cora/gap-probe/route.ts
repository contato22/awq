// GET /api/cora/gap-probe?month=YYYY-MM
//
// Diagnóstico empírico de gaps de sync Cora Holding: compara o que a API Cora
// retorna no período com o que está em `bank_transactions`, agrupado por dia.
// Saída identifica os dias com discrepância — sintoma de sync truncada.

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, isCoraConfigured } from "@/lib/cora-api";
import { getAllTransactions } from "@/lib/financial-db";
import { todayBRT } from "@/lib/date-brt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!isCoraConfigured()) {
    return NextResponse.json({ error: "Cora não configurado" }, { status: 501 });
  }

  const monthParam = req.nextUrl.searchParams.get("month") ?? todayBRT().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json({ error: "month deve ser YYYY-MM" }, { status: 400 });
  }

  const year  = parseInt(monthParam.slice(0, 4));
  const month = parseInt(monthParam.slice(5, 7));
  const nDays = daysInMonth(year, month);
  const from  = `${monthParam}-01`;
  const to    = `${monthParam}-${String(nDays).padStart(2, "0")}`;

  // ── 1. Cora API: fetch statement do mês inteiro (AWQ_Holding) ──
  let coraEntries: { date: string; id: string; amount: number; direction: string }[] = [];
  let coraError: string | null = null;
  try {
    const res = await fetchCoraStatement(from, to, "AWQ_Holding");
    coraEntries = res.entries.map((e) => ({
      date: e.date, id: e.id, amount: e.amount, direction: e.direction,
    }));
  } catch (err) {
    coraError = err instanceof Error ? err.message : String(err);
  }

  // ── 2. DB: bank_transactions Cora Holding no mesmo período ──
  let dbEntries: { date: string; id: string; amount: number; direction: string; runningBalance: number | null }[] = [];
  let dbError: string | null = null;
  let dbTotalAll = 0; // total de tx Cora Holding (qualquer data) — sanity check
  try {
    const all = await getAllTransactions();
    const coraHolding = all.filter((t) =>
      t.entity === "AWQ_Holding" && (t.bank ?? "").toLowerCase().includes("cora")
    );
    dbTotalAll = coraHolding.length;
    dbEntries = coraHolding
      .filter((t) => t.transactionDate >= from && t.transactionDate <= to)
      .map((t) => ({
        date: t.transactionDate, id: t.id, amount: t.amount,
        direction: t.direction, runningBalance: t.runningBalance,
      }));
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  // ── 3. Bucket por dia ──
  const coraByDay = new Map<string, number>();
  for (const e of coraEntries) {
    coraByDay.set(e.date, (coraByDay.get(e.date) ?? 0) + 1);
  }
  const dbByDay = new Map<string, number>();
  for (const e of dbEntries) {
    dbByDay.set(e.date, (dbByDay.get(e.date) ?? 0) + 1);
  }
  const dbRunningByDay = new Map<string, number>();
  for (const e of dbEntries) {
    if (e.runningBalance != null) dbRunningByDay.set(e.date, e.runningBalance);
  }

  // ── 4. Per-day breakdown + identificação de gaps ──
  const today = todayBRT();
  const lastVisibleDay = today.slice(0, 7) === monthParam ? today.slice(8) : String(nDays).padStart(2, "0");

  const days: Array<{
    date: string;
    cora: number;
    db: number;
    diff: number;
    runningBalance: number | null;
    status: "ok" | "gap" | "future" | "no-movement";
  }> = [];
  let gapCount = 0;
  let gapTxMissing = 0;

  for (let d = 1; d <= nDays; d++) {
    const date = `${monthParam}-${String(d).padStart(2, "0")}`;
    const cora = coraByDay.get(date) ?? 0;
    const db   = dbByDay.get(date) ?? 0;
    const diff = cora - db;
    const isFuture = date > today;
    let status: "ok" | "gap" | "future" | "no-movement";
    if (isFuture) status = "future";
    else if (cora === 0 && db === 0) status = "no-movement";
    else if (diff !== 0) { status = "gap"; gapCount++; gapTxMissing += Math.abs(diff); }
    else status = "ok";

    days.push({
      date, cora, db, diff,
      runningBalance: dbRunningByDay.get(date) ?? null,
      status,
    });
  }

  // ── 5. Última tx Cora Holding (em qualquer mês) — pista de quando a sync parou ──
  let lastDbTxDate: string | null = null;
  try {
    const all = await getAllTransactions();
    for (const t of all) {
      if (t.entity !== "AWQ_Holding") continue;
      if (!(t.bank ?? "").toLowerCase().includes("cora")) continue;
      if (!lastDbTxDate || t.transactionDate > lastDbTxDate) lastDbTxDate = t.transactionDate;
    }
  } catch { /* já reportado em dbError */ }

  // ── 6. Recomendação ──
  let recommendation = "Sync em dia — sem gaps detectados.";
  if (coraError) {
    recommendation = `Falha ao chamar API Cora: ${coraError}. Verificar mTLS/token.`;
  } else if (gapCount > 0) {
    recommendation =
      `${gapCount} dia(s) com gap · ${gapTxMissing} tx faltantes no DB. ` +
      `Rodar POST /api/cora/sync para reconciliar o período ${from} a ${to}.`;
  } else if (coraEntries.length === 0 && dbEntries.length === 0) {
    recommendation = "Nem Cora nem DB têm movimento no período — confirmar conta certa.";
  }

  return NextResponse.json({
    month: monthParam,
    range: { from, to, lastVisibleDay },
    account: "AWQ_Holding",
    summary: {
      cora_api_tx_total:   coraEntries.length,
      db_tx_total_period:  dbEntries.length,
      db_tx_total_alltime: dbTotalAll,
      last_db_tx_date:     lastDbTxDate,
      gap_days:            gapCount,
      gap_tx_missing:      gapTxMissing,
    },
    days,
    errors: {
      cora: coraError,
      db:   dbError,
    },
    recommendation,
  }, { status: 200 });
}

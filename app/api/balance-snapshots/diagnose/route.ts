// GET /api/balance-snapshots/diagnose?month=YYYY-MM
//
// Diagnóstico dia a dia do saldo consolidado AWQ_Holding no mês informado:
//   - snapshot persistido (daily_balance_snapshots) por dia + source
//   - runningBalance da última tx do dia em bank_transactions (DB)
//   - runningBalance da última tx do dia direto da API Cora (cross-check)
//   - diff entre snapshot, DB e API
//
// Identifica empiricamente onde a linha de saldo diverge da realidade.

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, fetchCoraBalanceForAccount, isCoraConfigured } from "@/lib/cora-api";
import { getAllTransactions } from "@/lib/financial-db";
import { getSnapshots } from "@/lib/balance-snapshots";
import { todayBRT } from "@/lib/date-brt";
import { getAuthIdentity, unauthorized } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const identity = await getAuthIdentity(req);
  if (!identity) return unauthorized();
  if (!isCoraConfigured()) return NextResponse.json({ error: "Cora não configurada" }, { status: 501 });

  const monthParam = req.nextUrl.searchParams.get("month") ?? todayBRT().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json({ error: "month deve ser YYYY-MM" }, { status: 400 });
  }
  const year = +monthParam.slice(0, 4);
  const mon  = +monthParam.slice(5, 7);
  const nDays = daysInMonth(year, mon);
  const from = `${monthParam}-01`;
  const to   = `${monthParam}-${String(nDays).padStart(2, "0")}`;

  // ── 1. DB: tx Cora Holding do mês com runningBalance ──
  const allTx = await getAllTransactions();
  const coraHoldingTx = allTx
    .filter((t) => t.entity === "AWQ_Holding"
      && (t.bank ?? "").toLowerCase().includes("cora")
      && t.transactionDate >= from && t.transactionDate <= to
      && t.runningBalance != null)
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
  const dbByDay = new Map<string, { balance: number; txCount: number }>();
  for (const t of coraHoldingTx) {
    const cur = dbByDay.get(t.transactionDate);
    dbByDay.set(t.transactionDate, {
      balance: t.runningBalance!, // último write vence (assume ordem cronológica)
      txCount: (cur?.txCount ?? 0) + 1,
    });
  }

  // ── 2. Cora API: mesmo mês ──
  let apiByDay = new Map<string, { balance: number | null; txCount: number }>();
  let apiError: string | null = null;
  try {
    const stmt = await fetchCoraStatement(from, to, "AWQ_Holding");
    for (const e of stmt.entries) {
      const cur = apiByDay.get(e.date);
      apiByDay.set(e.date, {
        balance: e.balance ?? cur?.balance ?? null,
        txCount: (cur?.txCount ?? 0) + 1,
      });
    }
  } catch (err) {
    apiError = err instanceof Error ? err.message : String(err);
  }

  // ── 3. Snapshots persistidos ──
  const snaps = await getSnapshots(from, to, "AWQ_Holding");
  const snapByDay = new Map<string, { balance: number; source: string }>();
  for (const s of snaps) {
    // Aggrega por dia somando todas as contas AWQ_Holding daquele dia
    const cur = snapByDay.get(s.snapshotDate);
    snapByDay.set(s.snapshotDate, {
      balance: (cur?.balance ?? 0) + s.balance,
      source: s.source,
    });
  }

  // ── 4. Live balance hoje (cross-check só pra hoje) ──
  const today = todayBRT();
  let liveBalance: number | null = null;
  if (today >= from && today <= to) {
    try {
      const { available } = await fetchCoraBalanceForAccount("AWQ_Holding");
      liveBalance = available;
    } catch { /* ignore */ }
  }

  // ── 5. Build day-by-day breakdown ──
  const days: Array<{
    date: string;
    db_balance: number | null;
    db_tx_count: number;
    api_tx_count: number;
    snapshot: number | null;
    snapshot_source: string | null;
    diff_snap_vs_db: number | null;
    note: string;
  }> = [];

  for (let d = 1; d <= nDays; d++) {
    const date = `${monthParam}-${String(d).padStart(2, "0")}`;
    const db  = dbByDay.get(date);
    const api = apiByDay.get(date);
    const snap = snapByDay.get(date);

    const diffSnapVsDb = (snap && db) ? Math.round((snap.balance - db.balance) * 100) / 100 : null;

    const notes: string[] = [];
    if (date > today) notes.push("future");
    if (db && api && db.txCount !== api.txCount) notes.push(`tx_count_mismatch(db=${db.txCount}, api=${api.txCount})`);
    if (!snap && db) notes.push("missing_snapshot");
    if (snap && !db) notes.push("snapshot_no_db_tx");
    if (diffSnapVsDb != null && Math.abs(diffSnapVsDb) > 0.01) notes.push(`snap_diverges_from_db`);

    days.push({
      date,
      db_balance:       db?.balance ?? null,
      db_tx_count:      db?.txCount ?? 0,
      api_tx_count:     api?.txCount ?? 0,
      snapshot:         snap?.balance ?? null,
      snapshot_source:  snap?.source ?? null,
      diff_snap_vs_db:  diffSnapVsDb,
      note:             notes.join(" | "),
    });
  }

  // ── 6. Summary ──
  const txTotal = coraHoldingTx.length;
  const snapTotal = snaps.length;
  const apiTxTotal = Array.from(apiByDay.values()).reduce((s, v) => s + v.txCount, 0);
  const divergentDays = days.filter((d) => d.diff_snap_vs_db != null && Math.abs(d.diff_snap_vs_db) > 0.01).length;
  const missingSnapshotDays = days.filter((d) => d.note.includes("missing_snapshot")).length;

  let lastDbBalance: number | null = null;
  let lastDbDate: string | null = null;
  for (const d of days) {
    if (d.db_balance != null) { lastDbBalance = d.db_balance; lastDbDate = d.date; }
  }

  return NextResponse.json({
    month: monthParam,
    today,
    summary: {
      db_tx_total:           txTotal,
      api_tx_total:          apiTxTotal,
      snapshots_total:       snapTotal,
      days_with_db_balance:  Array.from(dbByDay.keys()).length,
      days_with_snapshot:    Array.from(snapByDay.keys()).length,
      divergent_days:        divergentDays,
      missing_snapshot_days: missingSnapshotDays,
      last_db_balance:       lastDbBalance,
      last_db_date:          lastDbDate,
      live_balance_today:    liveBalance,
      api_error:             apiError,
    },
    days,
  }, { status: 200 });
}

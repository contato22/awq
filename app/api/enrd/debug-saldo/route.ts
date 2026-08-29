// GET /api/enrd/debug-saldo — diagnostico das txns ENERDY no DB
//
// Retorna estatisticas necessarias pra entender por que a linha de saldo
// nao aparece no chart: count total, range de datas, presenca de
// running_balance e direction, txns por mes.
//
// Publico (sem auth) — retorna so contadores, nenhum dado sensivel.

import { NextRequest, NextResponse } from "next/server";
import { getTransactionsByEntity } from "@/lib/financial-db";
import { verifyProbeSecret } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validDate(v: unknown): string {
  const s = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Endpoint público — vaza metadados financeiros se aberto. Exige PROBE_SECRET em prod.
  const denied = verifyProbeSecret(req);
  if (denied) return denied;

  try {
    const txns = await getTransactionsByEntity("ENERDY");

    const total = txns.length;
    const withDate    = txns.filter((t) => !!validDate(t.transactionDate)).length;
    const withRunBal  = txns.filter((t) => t.runningBalance != null).length;
    const credits     = txns.filter((t) => t.direction === "credit").length;
    const debits      = txns.filter((t) => t.direction === "debit").length;
    const otherDir    = total - credits - debits;

    // Range de datas
    let minDate = "", maxDate = "";
    for (const t of txns) {
      const d = validDate(t.transactionDate);
      if (!d) continue;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }

    // Txns por mes (top 12)
    const byMonth = new Map<string, { count: number; withRunBal: number }>();
    for (const t of txns) {
      const d = validDate(t.transactionDate);
      if (!d) continue;
      const mk = d.slice(0, 7);
      const b = byMonth.get(mk) ?? { count: 0, withRunBal: 0 };
      b.count += 1;
      if (t.runningBalance != null) b.withRunBal += 1;
      byMonth.set(mk, b);
    }
    const months = Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, v]) => ({ month, ...v }));

    // Sample do ultimo running_balance pra cada um dos 5 ultimos meses com dados
    const lastRunBalByMonth: Record<string, number | null> = {};
    for (const m of months.slice(0, 5)) {
      const monthTxns = txns
        .filter((t) => validDate(t.transactionDate).startsWith(m.month))
        .filter((t) => t.runningBalance != null)
        .sort((a, b) => {
          const da = validDate(a.transactionDate);
          const db = validDate(b.transactionDate);
          if (da !== db) return da < db ? 1 : -1;
          return String(a.id) < String(b.id) ? 1 : -1;
        });
      lastRunBalByMonth[m.month] = monthTxns[0]?.runningBalance ?? null;
    }

    // Sample raw transactionDate de 5 txns: tipo + serializacao
    const rawSamples = txns.slice(0, 5).map((t) => ({
      id: t.id,
      direction: t.direction,
      type: typeof t.transactionDate,
      stringified: String(t.transactionDate ?? "(null)"),
      jsonified: JSON.stringify(t.transactionDate),
      constructor: t.transactionDate?.constructor?.name ?? null,
      passesValidDate: /^\d{4}-\d{2}-\d{2}/.test(String(t.transactionDate ?? "")),
    }));

    return NextResponse.json({
      ok: true,
      entity: "ENERDY",
      total,
      withDate,
      withRunBal,
      credits,
      debits,
      otherDir,
      dateRange: { min: minDate || null, max: maxDate || null },
      months,
      lastRunBalByMonth,
      rawSamples,
      diagnosis:
        total === 0 ? "Nenhuma txn ENERDY no DB. Sync nao rodou ou retornou vazio."
        : withDate === 0 ? "Txns existem mas nenhuma tem transactionDate valido (YYYY-MM-DD)."
        : withRunBal === 0 ? "Txns tem datas mas running_balance NULL em todas — Cora sync nao gravou esse campo."
        : credits + debits === 0 ? "Txns sem direction credit/debit — chart nao consegue agregar bars."
        : "Dados aparentam estar OK. Verifique qual mes o user esta visualizando no chart.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 },
    );
  }
}

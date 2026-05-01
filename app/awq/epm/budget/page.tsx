// ─── /awq/epm/budget — Budget vs Actual ──────────────────────────────────────
//
// DATA SOURCE: awq-derived-metrics (canonical planning layer)
//   budgetVsActual, BUDGET_LINES, categoryBudget, buBudgetTargets
// REAL OVERLAY: buildDreQuery() — when real data available, actual = DRE data.

import Header from "@/components/Header";
import Link from "next/link";
import { Target, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import {
  budgetVsActual,
  consolidated,
  BUDGET_LINES,
  categoryBudget,
  operatingBus,
} from "@/lib/awq-derived-metrics";
import { buildDreQuery } from "@/lib/dre-query";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function VarBadge({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <span className={`text-[11px] font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>
      {positive ? "+" : ""}{pct.toFixed(1)}%
      {Math.abs(pct) > 10 && (
        <AlertTriangle size={10} className={`inline ml-0.5 ${positive ? "text-emerald-400" : "text-red-400"}`} />
      )}
    </span>
  );
}

function BudgetRow({
  label, actual, budget, depth = 0, bold = false,
}: {
  label: string; actual: number; budget: number; depth?: number; bold?: boolean;
}) {
  const variance    = actual - budget;
  const variancePct = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;
  const barWidth    = budget > 0 ? Math.min((actual / budget) * 100, 150) : 0;
  const over        = actual > budget;

  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50 ${bold ? "bg-gray-50 font-bold" : ""}`}>
      <td className={`py-2 px-3 text-xs ${bold ? "text-gray-900 font-bold" : "text-gray-700"}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}>
        {label}
      </td>
      <td className="py-2 px-3 text-right text-xs tabular-nums font-semibold text-gray-900">
        {fmtBRL(actual)}
      </td>
      <td className="py-2 px-3 text-right text-xs tabular-nums text-gray-500">
        {fmtBRL(budget)}
      </td>
      <td className={`py-2 px-3 text-right text-xs tabular-nums font-semibold ${over ? "text-emerald-600" : "text-red-600"}`}>
        {variance >= 0 ? "+" : ""}{fmtBRL(variance)}
      </td>
      <td className="py-2 px-3 text-right">
        <VarBadge pct={variancePct} />
      </td>
      <td className="py-2 px-3 w-24">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full ${barWidth > 100 ? "bg-amber-400" : "bg-emerald-400"}`}
            style={{ width: `${Math.min(barWidth, 100)}%` }}
          />
          {/* Budget line marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400" style={{ left: "100%" }} />
        </div>
      </td>
    </tr>
  );
}

export default async function EpmBudgetPage() {
  const dre  = await buildDreQuery("all");
  const snap = consolidated;

  function sumBudgLine(name: string) {
    const bl = BUDGET_LINES.find((l) => l.line === name);
    return bl ? bl.jacquesBudg + bl.cazaBudg + bl.advisorBudg : 0;
  }
  function sumActualLine(name: string) {
    const bl = BUDGET_LINES.find((l) => l.line === name);
    return bl ? bl.jacquesActual + bl.cazaActual + bl.advisorActual : 0;
  }

  // Use real DRE data for actuals if available, else snapshot
  const actualRevenue   = dre.hasData ? dre.dreRevenue   : snap.revenue;
  const actualEbitda    = dre.hasData ? dre.dreEBITDA    : sumActualLine("EBITDA");
  const actualNetIncome = dre.hasData ? dre.dreNetResult : sumActualLine("Lucro Líquido");

  const topLines = [
    { label: "Receita",   actual: actualRevenue,   budget: snap.budgetRevenue        },
    { label: "EBITDA",    actual: actualEbitda,    budget: sumBudgLine("EBITDA")     },
    { label: "Resultado", actual: actualNetIncome, budget: sumBudgLine("Lucro Líquido") },
  ];

  return (
    <>
      <Header
        title="Budget vs Actual"
        subtitle={`EPM · AWQ Group · YTD 2026 · ${dre.hasData ? "Base bancária real" : "Snapshot planejamento"}`}
      />
      <div className="page-container">

        {/* ── Data source notice ───────────────────────────────────── */}
        {!dre.hasData && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            Actuals baseados em snapshot de planejamento.{" "}
            <Link href="/awq/conciliacao" className="underline font-semibold">
              Ingerir extratos para dados reais →
            </Link>
          </div>
        )}

        {/* ── Top KPIs ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {topLines.map((l) => {
            const variance    = l.actual - l.budget;
            const variancePct = l.budget !== 0 ? (variance / Math.abs(l.budget)) * 100 : 0;
            const positive    = variance >= 0;
            return (
              <div key={l.label} className="card p-5">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">
                  {l.label}
                </div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{fmtBRL(l.actual)}</div>
                <div className="text-xs text-gray-400 mt-1">Budget: {fmtBRL(l.budget)}</div>
                <div className={`text-sm font-bold mt-1 ${positive ? "text-emerald-600" : "text-red-600"}`}>
                  {positive ? "+" : ""}{fmtBRL(variance)} ({positive ? "+" : ""}{variancePct.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Budget Lines table ───────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">Budget Lines — Consolidado</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> ≤100% budget
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> &gt;100% budget
              </span>
            </div>
          </div>
          <div className="table-scroll">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2 px-3 text-xs text-gray-500 font-semibold">Linha</th>
                  <th className="py-2 px-3 text-xs text-gray-500 font-semibold text-right">Actual</th>
                  <th className="py-2 px-3 text-xs text-gray-500 font-semibold text-right">Budget</th>
                  <th className="py-2 px-3 text-xs text-gray-500 font-semibold text-right">Var R$</th>
                  <th className="py-2 px-3 text-xs text-gray-500 font-semibold text-right">Var %</th>
                  <th className="py-2 px-3 text-xs text-gray-500 font-semibold w-24">vs. Budget</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_LINES.map((bl) => {
                  const blActual = bl.jacquesActual + bl.cazaActual + bl.advisorActual;
                  const blBudget = bl.jacquesBudg   + bl.cazaBudg   + bl.advisorBudg;
                  return (
                    <BudgetRow
                      key={bl.line}
                      label={bl.line}
                      actual={blActual}
                      budget={blBudget}
                      bold={bl.line === "Receita" || bl.line === "EBITDA" || bl.line === "Lucro Líquido"}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Budget by BU ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Budget por Business Unit — Receita</span>
          </div>
          <div className="space-y-3">
            {operatingBus.map((bu) => {
              const budgRev = bu.budgetRevenue;
              const actRev  = bu.revenue;
              const pct     = budgRev > 0 ? (actRev / budgRev) * 100 : 0;
              const varPct  = budgRev > 0 ? ((actRev - budgRev) / budgRev) * 100 : 0;

              return (
                <div key={bu.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{bu.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400">Actual: {fmtBRL(actRev)}</span>
                      <span className="text-gray-400">Budget: {fmtBRL(budgRev)}</span>
                      <VarBadge pct={varPct} />
                    </div>
                  </div>
                  <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 100 ? "bg-amber-400" : "bg-brand-500"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Category Budget ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-gray-900">Budget por Categoria — OPEX</span>
          </div>
          <div className="table-scroll">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 px-2 text-xs text-gray-500 font-semibold">Categoria</th>
                  <th className="py-2 px-2 text-xs text-gray-500 font-semibold text-right">Actual</th>
                  <th className="py-2 px-2 text-xs text-gray-500 font-semibold text-right">Budget</th>
                  <th className="py-2 px-2 text-xs text-gray-500 font-semibold text-right">Var %</th>
                  <th className="py-2 px-2 text-xs text-gray-500 font-semibold w-24">Barra</th>
                </tr>
              </thead>
              <tbody>
                {categoryBudget.map((cb) => {
                  const pct    = cb.budget > 0 ? (cb.actual / cb.budget) * 100 : 0;
                  const varPct = cb.budget > 0 ? ((cb.actual - cb.budget) / cb.budget) * 100 : 0;
                  return (
                    <tr key={cb.category} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 text-xs text-gray-700">{cb.category}</td>
                      <td className="py-2 px-2 text-right text-xs tabular-nums font-semibold">
                        {fmtBRL(cb.actual)}
                      </td>
                      <td className="py-2 px-2 text-right text-xs tabular-nums text-gray-500">
                        {fmtBRL(cb.budget)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <VarBadge pct={varPct} />
                      </td>
                      <td className="py-2 px-2">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 100 ? "bg-red-400" : "bg-violet-400"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/pl" className="text-brand-600 hover:underline">P&L →</Link>
          <Link href="/awq/epm/kpis" className="text-brand-600 hover:underline">KPIs →</Link>
        </div>

      </div>
    </>
  );
}

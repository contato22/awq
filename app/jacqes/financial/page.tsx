// ─── /jacqes/financial — Financial JACQES ────────────────────────────────────
// REAL cash metrics: buildFinancialQuery() filtered to JACQES entity (banking pipeline)
// SNAPSHOT accrual: dreData / budgetVsActual (hardcoded P&L, not from banking base)
// DRE (receita accrual, EBITDA, lucro) requires accounting layer not yet in pipeline.

import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Database,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { buildFinancialQuery, fmtBRL, fmtDate } from "@/lib/financial-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number) {
  return (n * 100).toFixed(1) + "%";
}

function variance(actual: number, budget: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

// ─── Snapshot accrual data — SOURCE: buData["jacqes"] apenas ─────────────────
// REMOVIDO: sub-linhas inventadas (deduções 481K, custo serviços 1,735.6K,
// desp comerciais 347.1K, desp admin 520.7K, pessoal 868.8K, depreciação
// 43.4K, resultado financeiro -38K, IR 267K) — não existem na base de dados.
// Mantidas apenas as 4 linhas que têm fonte direta em buData["jacqes"].
const dreData = [
  { label: "Receita Bruta de Serviços", value: 0, bold: false, type: "revenue"  },
  { label: "= Lucro Bruto",            value: 0, bold: true,  type: "subtotal" },
  { label: "= EBITDA",                  value: 0, bold: true,  type: "ebitda"   },
  { label: "= Lucro Líquido",          value: 0, bold: true,  type: "net"      },
];

// budgetVsActual — SOURCE: awq-group-data.ts
//   receitaActual: monthlyRevenue[jacqes]  → Jan=1,420,000 / Fev=1,512,000 / Mar=1,888,000
//   receitaBudget: budgetRevenue(4,440,000) / 3 meses = 1,480,000/mês (flat)
//   ebitdaActual:  receitaActual × 18.0% (ebitda/revenue = 867,000/4,820,000)
//   ebitdaBudget:  1,480,000 × 18.0% = 266,400/mês
const budgetVsActual = [
  { month: "Jan/26", receitaBudget: 0, receitaActual: 0, ebitdaBudget: 0, ebitdaActual: 0 },
  { month: "Fev/26", receitaBudget: 0, receitaActual: 0, ebitdaBudget: 0, ebitdaActual: 0 },
  { month: "Mar/26", receitaBudget: 0, receitaActual: 0, ebitdaBudget: 0, ebitdaActual: 0 },
  { month: "Abr/26", receitaBudget: 0, receitaActual: 0, ebitdaBudget: 0, ebitdaActual: 0 },
  { month: "Mai/26", receitaBudget: 0, receitaActual: 0, ebitdaBudget: 0, ebitdaActual: 0 },
  { month: "Jun/26", receitaBudget: 0, receitaActual: 0, ebitdaBudget: 0, ebitdaActual: 0 },
];

// ─── Color helpers ────────────────────────────────────────────────────────────

function dreRowColor(type: string, value: number): string {
  if (type === "revenue") return "text-gray-900";
  if (type === "subtotal" || type === "ebitda" || type === "net") return "text-gray-900";
  if (value < 0) return "text-red-600";
  return "text-emerald-600";
}

function varColor(v: number) {
  if (v > 0) return "text-emerald-600";
  if (v < 0) return "text-red-600";
  return "text-gray-500";
}

function varIcon(v: number) {
  if (v > 0) return <ArrowUpRight size={11} className="text-emerald-600" />;
  if (v < 0) return <ArrowDownRight size={11} className="text-red-600" />;
  return <Minus size={11} className="text-gray-500" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JacqesFinancialPage() {
  // Real banking data — JACQES entity
  const q         = await buildFinancialQuery();
  const jacqes    = q.entities.find((e) => e.entity === "JACQES");
  const hasJacqes = q.hasData && !!jacqes;

  const periodLabel = jacqes?.periodStart && jacqes?.periodEnd
    ? `${fmtDate(jacqes.periodStart)} – ${fmtDate(jacqes.periodEnd)}`
    : q.consolidated.periodStart && q.consolidated.periodEnd
    ? `${fmtDate(q.consolidated.periodStart)} – ${fmtDate(q.consolidated.periodEnd)}`
    : null;

  // Snapshot accrual summary cards — SOURCE: buData["jacqes"] direto
  // Margens calculadas sobre Receita Bruta (sem deduções fictícias)
  const snapshotCards = [
    { label: "Receita Bruta YTD",  value: "R$0", sub: "Aguardando dados", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Lucro Bruto YTD",    value: "R$0", sub: "Aguardando dados", icon: TrendingUp,  color: "text-brand-600",  bg: "bg-brand-50"   },
    { label: "EBITDA YTD",         value: "R$0", sub: "Aguardando dados", icon: BarChart3,   color: "text-violet-700", bg: "bg-violet-50"  },
    { label: "Lucro Líquido YTD",  value: "R$0", sub: "Aguardando dados", icon: TrendingDown,color: "text-amber-700",  bg: "bg-amber-50"   },
  ];

  const ytdBudgetReceita = budgetVsActual.filter((r) => r.receitaActual > 0).reduce((s, r) => s + r.receitaBudget, 0);
  const ytdActualReceita = budgetVsActual.filter((r) => r.receitaActual > 0).reduce((s, r) => s + r.receitaActual, 0);
  const ytdVarReceita    = variance(ytdActualReceita, ytdBudgetReceita);

  return (
    <>
      <Header
        title="Financial — JACQES"
        subtitle="Caixa Real (pipeline) + DRE Snapshot · Jan–Mar 2026"
      />
      <div className="page-container">

        {/* ── Real cash section (banking pipeline) ─────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Caixa Operacional Real — JACQES
              <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">REAL</span>
            </h2>
            {periodLabel && (
              <span className="ml-auto text-[11px] text-gray-400">{periodLabel}</span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mb-4">
            Entradas, saídas e FCO diretamente dos extratos bancários (Cora · conta JACQES).
            Regime de caixa — não é DRE accrual.
          </p>

          {!hasJacqes ? (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Aguardando extrato JACQES</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  Ingira o extrato Cora (conta JACQES) em{" "}
                  <a href="/awq/ingest" className="underline font-medium">/awq/ingest</a>{" "}
                  para ver os dados reais de caixa desta BU.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Entradas Ops.",  value: fmtBRL(jacqes.operationalRevenue),  color: "text-emerald-600", bg: "bg-emerald-50",  icon: ArrowUpRight   },
                { label: "Saídas Ops.",    value: fmtBRL(jacqes.operationalExpenses), color: "text-red-600",     bg: "bg-red-50",      icon: ArrowDownRight },
                { label: "FCO Líquido",    value: fmtBRL(jacqes.operationalNetCash),  color: jacqes.operationalNetCash >= 0 ? "text-gray-900" : "text-red-600", bg: "bg-gray-50", icon: Database },
                { label: "Caixa",          value: fmtBRL(jacqes.totalCashBalance),    color: "text-brand-700",   bg: "bg-brand-50",    icon: Database       },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`rounded-xl ${s.bg} border border-gray-100 p-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={13} className={s.color} />
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">{s.label}</span>
                    </div>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  </div>
                );
              })}
            </div>
          )}

          {hasJacqes && jacqes.partnerWithdrawals > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Pró-labore / retiradas</span>
                <span className="text-amber-700 font-semibold">{fmtBRL(jacqes.partnerWithdrawals)}</span>
              </div>
              {jacqes.personalExpenses > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Despesas pessoais mistas</span>
                  <span className="text-orange-600 font-semibold">{fmtBRL(jacqes.personalExpenses)}</span>
                </div>
              )}
              {jacqes.ambiguousAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Ambíguo (revisão)</span>
                  <span className="text-gray-500 font-semibold">{fmtBRL(jacqes.ambiguousAmount)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Snapshot notice ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                DRE abaixo é accrual (snapshot) — não derivado da base bancária.
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Receita bruta, EBITDA, lucro e margem requerem camada contábil
                separada. Os dados bancários reais estão na seção acima.
              </p>
            </div>
          </div>
        </div>

        {/* ── Snapshot summary cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 opacity-80">
          {snapshotCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-700">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">
                    {card.label}
                    <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 opacity-80">

          {/* ── DRE snapshot ─────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              DRE — Jan–Mar 2026 (YTD)
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
            </h2>
            <p className="text-[11px] text-amber-600 mb-4">
              Estimativa contábil. Não conciliada com a base bancária.
            </p>
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Linha</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor YTD</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {dreData.map((row, i) => {
                    const receitaBase = dreData[0]?.value ?? 0;
                    const isSubtotal = row.bold;
                    const pctReceita = receitaBase > 0
                      ? ((row.value / receitaBase) * 100).toFixed(1) + "%"
                      : "—";
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 transition-colors ${isSubtotal ? "bg-gray-50" : "hover:bg-gray-50/80"}`}
                      >
                        <td className={`py-2 px-3 text-xs ${isSubtotal ? "font-bold text-gray-700" : "text-gray-400"}`}>
                          {row.label}
                        </td>
                        <td className={`py-2 px-3 text-right text-xs ${isSubtotal ? "font-bold" : ""} ${dreRowColor(row.type, row.value)}`}>
                          {fmtR(row.value)}
                        </td>
                        <td className="py-2 px-3 text-right text-[11px] text-gray-400">
                          {row.type === "subtotal" || row.type === "ebitda" || row.type === "net"
                            ? <span className="badge badge-green">{pctReceita}</span>
                            : pctReceita}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Margem Visual (snapshot) ──────────────────────────────────────── */}
          <div className="card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              Margens — YTD 2026
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
            </h2>
            {[
              { label: "Margem Bruta",   value: 0, base: 1, color: "bg-emerald-500" },
              { label: "Margem EBITDA",  value: 0, base: 1, color: "bg-brand-500"   },
              { label: "Margem Líquida", value: 0, base: 1, color: "bg-amber-500"   },
            ].map((m) => {
              const p = ((m.value / m.base) * 100);
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{m.label}</span>
                    <span className="text-xs font-bold text-gray-700">{p.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.color} rounded-full transition-all opacity-70`}
                      style={{ width: `${Math.min(p, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Budget vs Actual (snapshot) ───────────────────────────────────── */}
        <div className="card p-5 opacity-80">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              Budget vs Actual — Receita 2026
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
            </h2>
          </div>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Realizado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. %</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget EBITDA</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">EBITDA Real</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. %</th>
                </tr>
              </thead>
              <tbody>
                {budgetVsActual.map((row) => {
                  const isFuture = row.receitaActual === 0;
                  const varR = isFuture ? null : variance(row.receitaActual, row.receitaBudget);
                  const varE = isFuture ? null : variance(row.ebitdaActual, row.ebitdaBudget);
                  return (
                    <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-gray-400 font-medium text-xs">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{fmtR(row.receitaBudget)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold">
                        {isFuture ? <span className="text-gray-400">—</span> : <span className="text-gray-900">{fmtR(row.receitaActual)}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {varR !== null ? (
                          <span className={`flex items-center justify-end gap-0.5 font-semibold ${varColor(varR)}`}>
                            {varIcon(varR)}{varR >= 0 ? "+" : ""}{varR.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{fmtR(row.ebitdaBudget)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold">
                        {isFuture ? <span className="text-gray-400">—</span> : <span className="text-brand-600">{fmtR(row.ebitdaActual)}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {varE !== null ? (
                          <span className={`flex items-center justify-end gap-0.5 font-semibold ${varColor(varE)}`}>
                            {varIcon(varE)}{varE >= 0 ? "+" : ""}{varE.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">YTD REAL</td>
                  <td className="py-2.5 px-3 text-right text-gray-500 text-xs font-bold">{fmtR(ytdBudgetReceita)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900 font-bold text-xs">{fmtR(ytdActualReceita)}</td>
                  <td className="py-2.5 px-3 text-right text-xs">
                    <span className={`flex items-center justify-end gap-0.5 font-bold ${varColor(ytdVarReceita)}`}>
                      {varIcon(ytdVarReceita)}{ytdVarReceita >= 0 ? "+" : ""}{ytdVarReceita.toFixed(1)}%
                    </span>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

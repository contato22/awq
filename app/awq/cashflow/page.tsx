// ─── /awq/cashflow — Fluxo de Caixa Operacional ─────────────────────────────
// DATA SOURCE: financial-db.ts (canonical pipeline store) via financial-query.ts
// METHODOLOGY: Cash-basis — receipts and disbursements from ingested bank statements.
//              This is NOT a DRE / accrual P&L.  Label: "Visão de Caixa".
// NO MOCKS, NO SNAPSHOTS, NO HARDCODES.
// When hasData === false, render honest empty state.

import Header from "@/components/Header";
import ReconciliationReviewTable, { type ReviewItem } from "@/components/ReconciliationReviewTable";
import {
  Zap,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  MinusCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  buildFinancialQuery,
  fmtBRL,
  fmtDate,
  ENTITY_LABELS,
  CATEGORY_LABELS,
  type MonthlyEntry,
  type EntityLayer,
  type DFCStatement,
  type DREStatement,
  type ReconciliationQueue,
} from "@/lib/financial-query";

// ─── Sub-components ───────────────────────────────────────────────────────────

function NoDataBanner({ gaps }: { gaps: string[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Aguardando extratos bancários</p>
          <p className="text-xs text-amber-700 mt-1">
            Nenhum extrato processado ainda. Os dados abaixo mostram zero enquanto os
            PDFs não forem ingeridos via{" "}
            <a href="/awq/ingest" className="underline font-medium">
              /awq/ingest
            </a>
            .
          </p>
          {gaps.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {gaps.map((g) => (
                <li key={g} className="text-[11px] text-amber-600 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  positive,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-gray-900 truncate">{value}</div>
        <div className="text-xs font-medium text-gray-400 mt-0.5">{label}</div>
        <div className="flex items-center gap-1 mt-1">
          {positive
            ? <ArrowUpRight size={11} className="text-emerald-600" />
            : <ArrowDownRight size={11} className="text-red-600" />}
          <span className="text-[10px] text-gray-400">{sub}</span>
        </div>
      </div>
    </div>
  );
}

/** Monthly bar chart using inline bar widths — no client component needed. */
function MonthlyBridgeChart({ entries }: { entries: MonthlyEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-gray-400">
        Sem dados mensais disponíveis.
      </div>
    );
  }

  const months = Array.from(new Set(entries.map((e) => e.month))).sort();
  const maxVal  = Math.max(
    ...entries.map((e) => Math.max(e.revenue, e.expenses, 1))
  );

  const ENTITY_COLORS: Record<EntityLayer, string> = {
    AWQ_Holding:  "bg-violet-500",
    JACQES:       "bg-brand-500",
    Caza_Vision:  "bg-emerald-500",
    Intercompany: "bg-gray-300",
    Socio_PF:     "bg-amber-400",
    Unknown:      "bg-gray-200",
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-[600px]">
        {months.map((month) => {
          const monthEntries = entries.filter((e) => e.month === month);
          const totalRev     = monthEntries.reduce((s, e) => s + e.revenue, 0);
          const totalExp     = monthEntries.reduce((s, e) => s + e.expenses, 0);
          const net          = totalRev - totalExp;
          const revW         = Math.min((totalRev / maxVal) * 100, 100);
          const expW         = Math.min((totalExp / maxVal) * 100, 100);
          const [, mm]       = month.split("-");
          const monthLabel   = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][
            parseInt(mm, 10) - 1
          ] ?? mm;

          return (
            <div key={month} className="flex-1 min-w-[80px]">
              <div className="text-[10px] font-semibold text-gray-500 mb-1.5 text-center">
                {monthLabel}
              </div>
              <div className="space-y-1">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden" title={`Entradas: ${fmtBRL(totalRev)}`}>
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${revW}%` }}
                  />
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden" title={`Saídas: ${fmtBRL(totalExp)}`}>
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${expW}%` }}
                  />
                </div>
              </div>
              <div className="text-center mt-1.5">
                <span className={`text-[10px] font-bold ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {net >= 0 ? "+" : ""}{fmtBRL(net)}
                </span>
              </div>
              {/* entity dots */}
              <div className="flex justify-center gap-1 mt-1">
                {monthEntries.map((e) => (
                  <span
                    key={e.entity}
                    className={`w-1.5 h-1.5 rounded-full ${ENTITY_COLORS[e.entity] ?? "bg-gray-300"}`}
                    title={ENTITY_LABELS[e.entity]}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Entradas
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Saídas
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqCashflowPage() {
  const q   = await buildFinancialQuery();
  const c   = q.consolidated;
  const gap = q.dataQuality.coverageGaps;

  const periodLabel = c.periodStart && c.periodEnd
    ? `${fmtDate(c.periodStart)} – ${fmtDate(c.periodEnd)}`
    : "Período: aguardando extratos";

  const kpis = [
    {
      label:    "FCO Operacional",
      value:    fmtBRL(c.operationalNetCash),
      sub:      periodLabel,
      positive: c.operationalNetCash >= 0,
      icon:     Zap,
      color:    c.operationalNetCash >= 0 ? "text-emerald-600" : "text-red-600",
      bg:       c.operationalNetCash >= 0 ? "bg-emerald-50"    : "bg-red-50",
    },
    {
      label:    "Entradas Operacionais",
      value:    fmtBRL(c.totalRevenue),
      sub:      "Receitas classificadas",
      positive: true,
      icon:     ArrowUpRight,
      color:    "text-brand-600",
      bg:       "bg-brand-50",
    },
    {
      label:    "Saídas Operacionais",
      value:    fmtBRL(c.totalExpenses),
      sub:      "Despesas classificadas",
      positive: false,
      icon:     ArrowDownRight,
      color:    "text-red-600",
      bg:       "bg-red-50",
    },
    {
      label:    "Caixa Total",
      value:    fmtBRL(c.totalCashBalance),
      sub:      `${c.documentCount} conta(s) ingerida(s)`,
      positive: c.totalCashBalance >= 0,
      icon:     DollarSign,
      color:    "text-violet-700",
      bg:       "bg-violet-50",
    },
  ];

  // ── FCO waterfall rows (real data only) ─────────────────────────────────────
  const waterfallRows: { label: string; value: number; indent: number; bold: boolean }[] = [
    { label: "Entradas Operacionais",          value:  c.totalRevenue,          indent: 0, bold: false },
    { label: "  (−) Saídas Operacionais",      value: -c.totalExpenses,         indent: 1, bold: false },
    { label: "= FCO Caixa",                    value:  c.operationalNetCash,     indent: 0, bold: true  },
    { label: "  (−) Pró-labore / Retiradas",   value: -c.partnerWithdrawals,     indent: 1, bold: false },
    { label: "  (−) Despesas Pessoais",        value: -c.personalExpenses,       indent: 1, bold: false },
    { label: "= Fluxo Ajustado",               value:  c.operationalNetCash - c.partnerWithdrawals - c.personalExpenses, indent: 0, bold: true },
    { label: "  Elim. Intercompany",           value: -c.intercompanyEliminated, indent: 1, bold: false },
    { label: "  Movimentos Financeiros (net)", value:  c.financialMovements,     indent: 1, bold: false },
    { label: "  Ambíguo (revisão pendente)",   value:  c.ambiguousAmount,        indent: 1, bold: false },
  ];

  const maxWaterfallVal = Math.max(...waterfallRows.map((r) => Math.abs(r.value)), 1);

  // ── Cash position per account (sorted by closingBalance desc) ───────────────
  const sortedAccounts = [...q.accounts].sort((a, b) => b.closingBalance - a.closingBalance);
  const totalClosing   = sortedAccounts.reduce((s, a) => s + a.closingBalance, 0);

  // ── Entity summary rows ──────────────────────────────────────────────────────
  const operationalEntities = q.entities.filter((e) =>
    ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity)
  );

  return (
    <>
      <Header
        title="Cash Flow — AWQ Group"
        subtitle={`Fluxo de caixa operacional · Visão de Caixa · ${periodLabel}`}
      />
      <div className="page-container">

        {/* ── Data quality notice ──────────────────────────────────────────── */}
        {!q.hasData && <NoDataBanner gaps={gap} />}

        {q.hasData && gap.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
              <AlertCircle size={13} /> Lacunas de cobertura
            </p>
            <ul className="space-y-0.5">
              {gap.map((g) => (
                <li key={g} className="text-[11px] text-amber-600 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* ── FCO Waterfall + Monthly Bridge ──────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Waterfall */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              FCO Waterfall — Visão de Caixa
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Baseado exclusivamente nos extratos ingeridos. Capex e distribuições
              não estão disponíveis nesta base.
            </p>
            <div className="space-y-2">
              {waterfallRows.map((row, i) => {
                const barW  = Math.min((Math.abs(row.value) / maxWaterfallVal) * 100, 100);
                const isNeg = row.value < 0;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 ${row.bold ? "py-1 px-2 bg-gray-50 rounded-lg" : ""}`}
                  >
                    <span
                      className={`text-xs shrink-0 w-52 ${row.bold ? "font-bold text-gray-900" : "text-gray-500"}`}
                      style={{ paddingLeft: `${row.indent * 12}px` }}
                    >
                      {row.label}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.bold
                            ? isNeg ? "bg-red-500" : "bg-brand-500"
                            : isNeg ? "bg-red-300" : "bg-emerald-400"
                        }`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold w-22 text-right shrink-0 ${
                        row.bold
                          ? isNeg ? "text-red-700 font-bold" : "text-gray-900 font-bold"
                          : isNeg ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {isNeg ? "" : "+"}{fmtBRL(row.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly bridge */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Bridge Mensal — Entradas vs Saídas
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Fluxo operacional por mês, excluindo transferências intercompany.
            </p>
            <MonthlyBridgeChart entries={q.monthlyBridge} />
          </div>

        </div>

        {/* ── Entity Breakdown ─────────────────────────────────────────────── */}
        {operationalEntities.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Fluxo por Entidade — Visão de Caixa
            </h2>
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Entidade</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600">Entradas</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-red-600">Saídas</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-brand-600">FCO</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-amber-700">Pró-labore</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Caixa</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Docs</th>
                  </tr>
                </thead>
                <tbody>
                  {operationalEntities.map((e) => (
                    <tr key={e.entity} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2 px-3 text-xs font-medium text-gray-800">{e.label}</td>
                      <td className="py-2 px-3 text-right text-xs text-emerald-600 font-semibold">
                        {fmtBRL(e.operationalRevenue)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-red-600">
                        {fmtBRL(e.operationalExpenses)}
                      </td>
                      <td className={`py-2 px-3 text-right text-xs font-bold ${e.operationalNetCash >= 0 ? "text-brand-600" : "text-red-600"}`}>
                        {fmtBRL(e.operationalNetCash)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-amber-700">
                        {fmtBRL(e.partnerWithdrawals)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-gray-700 font-semibold">
                        {fmtBRL(e.totalCashBalance)}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-gray-400">
                        {e.documentCount}
                      </td>
                    </tr>
                  ))}
                  {/* Consolidado row */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="py-2 px-3 text-xs font-bold text-gray-900">Consolidado</td>
                    <td className="py-2 px-3 text-right text-xs font-bold text-emerald-600">
                      {fmtBRL(c.totalRevenue)}
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-bold text-red-600">
                      {fmtBRL(c.totalExpenses)}
                    </td>
                    <td className={`py-2 px-3 text-right text-xs font-bold ${c.operationalNetCash >= 0 ? "text-brand-600" : "text-red-600"}`}>
                      {fmtBRL(c.operationalNetCash)}
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-bold text-amber-700">
                      {fmtBRL(c.partnerWithdrawals)}
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-bold text-gray-900">
                      {fmtBRL(c.totalCashBalance)}
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-bold text-gray-500">
                      {c.documentCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <MinusCircle size={10} /> Eliminação intercompany aplicada:{" "}
              <span className="font-semibold">{fmtBRL(c.intercompanyEliminated)}</span>
            </p>
          </div>
        )}

        {/* ── DFC — Atividades por cashflowClass explícito ─────────────────── */}
        {q.hasData && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <TrendingUp size={15} className="text-brand-500" />
              DFC — Demonstrativo do Fluxo de Caixa por Atividade
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              CPC 03 / IFRS IAS 7 — agregado a partir de{" "}
              <code className="text-[10px] bg-gray-100 px-1 rounded">cashflowClass</code>{" "}
              explícito por transação. Variação de caixa:{" "}
              <span className={`font-semibold ${q.dfcStatement.variacaoCaixa >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {q.dfcStatement.variacaoCaixa >= 0 ? "+" : ""}{fmtBRL(q.dfcStatement.variacaoCaixa)}
              </span>
            </p>
            <div className="space-y-4">

              {/* Operacional */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                    Operacional
                  </span>
                  <span className="text-[10px] text-gray-400">FCO — receitas e despesas do negócio</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pl-2">
                  <div className="bg-emerald-50/60 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500">Entradas</div>
                    <div className="text-sm font-bold text-emerald-700">+{fmtBRL(q.dfcStatement.operacional.entradas)}</div>
                  </div>
                  <div className="bg-red-50/60 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500">Saídas</div>
                    <div className="text-sm font-bold text-red-700">−{fmtBRL(q.dfcStatement.operacional.saidas)}</div>
                  </div>
                  <div className={`rounded-lg px-3 py-2 ${q.dfcStatement.operacional.liquido >= 0 ? "bg-brand-50/60" : "bg-red-50/60"}`}>
                    <div className="text-[10px] text-gray-500">FCO Líquido</div>
                    <div className={`text-sm font-bold ${q.dfcStatement.operacional.liquido >= 0 ? "text-brand-700" : "text-red-700"}`}>
                      {q.dfcStatement.operacional.liquido >= 0 ? "+" : ""}{fmtBRL(q.dfcStatement.operacional.liquido)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Investimento */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                    Investimento
                  </span>
                  <span className="text-[10px] text-gray-400">Aplicações, resgates, rendimentos financeiros</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pl-2">
                  <div className="bg-violet-50/40 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500">Entradas</div>
                    <div className="text-sm font-bold text-violet-700">+{fmtBRL(q.dfcStatement.investimento.entradas)}</div>
                  </div>
                  <div className="bg-violet-50/40 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500">Saídas</div>
                    <div className="text-sm font-bold text-violet-600">−{fmtBRL(q.dfcStatement.investimento.saidas)}</div>
                  </div>
                  <div className={`rounded-lg px-3 py-2 ${q.dfcStatement.investimento.liquido >= 0 ? "bg-violet-50/60" : "bg-red-50/60"}`}>
                    <div className="text-[10px] text-gray-500">FCInv Líquido</div>
                    <div className={`text-sm font-bold ${q.dfcStatement.investimento.liquido >= 0 ? "text-violet-700" : "text-red-700"}`}>
                      {q.dfcStatement.investimento.liquido >= 0 ? "+" : ""}{fmtBRL(q.dfcStatement.investimento.liquido)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financiamento */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                    Financiamento
                  </span>
                  <span className="text-[10px] text-gray-400">Pró-labore, retiradas, aportes de sócios</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pl-2">
                  <div className="bg-amber-50/40 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500">Entradas (aportes)</div>
                    <div className="text-sm font-bold text-amber-700">+{fmtBRL(q.dfcStatement.financiamento.entradas)}</div>
                  </div>
                  <div className="bg-amber-50/40 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500">Saídas (retiradas)</div>
                    <div className="text-sm font-bold text-amber-600">−{fmtBRL(q.dfcStatement.financiamento.saidas)}</div>
                  </div>
                  <div className={`rounded-lg px-3 py-2 ${q.dfcStatement.financiamento.liquido >= 0 ? "bg-amber-50/60" : "bg-red-50/60"}`}>
                    <div className="text-[10px] text-gray-500">FCFin Líquido</div>
                    <div className={`text-sm font-bold ${q.dfcStatement.financiamento.liquido >= 0 ? "text-amber-700" : "text-red-700"}`}>
                      {q.dfcStatement.financiamento.liquido >= 0 ? "+" : ""}{fmtBRL(q.dfcStatement.financiamento.liquido)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Exclusão + Pendente */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                {q.dfcStatement.exclusao > 0 && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500">Exclusão (intercompany)</div>
                    <div className="text-sm font-bold text-gray-600">±{fmtBRL(q.dfcStatement.exclusao)}</div>
                  </div>
                )}
                {q.dfcStatement.pendente > 0 && (
                  <div className="bg-amber-50/60 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircle size={11} className="text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-gray-500">Pendente / Ambíguo</div>
                      <div className="text-sm font-bold text-amber-600">{fmtBRL(q.dfcStatement.pendente)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DFC por Categoria — detalhe auditável ─────────────────────────── */}
        {q.hasData && q.dfcStatement.byCategory.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <TrendingUp size={15} className="text-violet-500" />
              DFC por Categoria — Detalhe Auditável
            </h2>
            <p className="text-[11px] text-gray-400 mb-3">
              Cada categoria com cashflowClass ≠ exclusão. Fonte: por transação.
            </p>
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Classe DFC</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Entradas</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Saídas</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Líquido</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Txns</th>
                  </tr>
                </thead>
                <tbody>
                  {q.dfcStatement.byCategory.map((line) => (
                    <tr key={`${line.category}__${line.cashflowClass}`} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-1.5 px-2 text-gray-700 font-medium">{line.categoryLabel}</td>
                      <td className="py-1.5 px-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          line.cashflowClass === "operacional"   ? "bg-emerald-100 text-emerald-700" :
                          line.cashflowClass === "investimento"  ? "bg-violet-100 text-violet-700" :
                          line.cashflowClass === "financiamento" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {line.cashflowClass}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-emerald-700 font-medium">{line.entradas > 0 ? `+${fmtBRL(line.entradas)}` : "—"}</td>
                      <td className="py-1.5 px-2 text-right text-red-600 font-medium">{line.saidas > 0 ? `−${fmtBRL(line.saidas)}` : "—"}</td>
                      <td className={`py-1.5 px-2 text-right font-bold ${line.liquido >= 0 ? "text-brand-700" : "text-red-700"}`}>
                        {line.liquido >= 0 ? "+" : ""}{fmtBRL(line.liquido)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-gray-400">{line.txCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DFC Final — Base Conciliada ──────────────────────────────────── */}
        {q.hasData && q.dfcStatement.conciliado.txCount > 0 && (
          <div className="card p-5 border-brand-200 bg-brand-50/20">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <TrendingUp size={15} className="text-brand-500" />
              DFC Final — Base Conciliada
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-brand-100 text-brand-700">conciliado</span>
            </h2>
            <p className="text-[11px] text-gray-400 mb-3">
              Apenas transações com{" "}
              <code className="text-[10px] bg-gray-100 px-1 rounded">reconciliationStatus=conciliado</code>.
              Esta é a base que alimenta os KPIs finais.{" "}
              <span className="font-medium text-brand-700">{q.dfcStatement.conciliado.txCount} transações</span>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                { label: "FCO Líquido",   value: q.dfcStatement.conciliado.operacional.liquido,   color: "text-emerald-700" },
                { label: "FCInv Líquido", value: q.dfcStatement.conciliado.investimento.liquido,  color: "text-violet-700"  },
                { label: "FCFin Líquido", value: q.dfcStatement.conciliado.financiamento.liquido, color: "text-amber-700"   },
                { label: "Variação de Caixa", value: q.dfcStatement.conciliado.variacaoCaixa, color: q.dfcStatement.conciliado.variacaoCaixa >= 0 ? "text-brand-700" : "text-red-700" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-lg px-3 py-2 border border-brand-100">
                  <div className="text-[10px] text-gray-400">{item.label}</div>
                  <div className={`text-sm font-bold ${item.color}`}>
                    {item.value >= 0 ? "+" : ""}{fmtBRL(item.value)}
                  </div>
                </div>
              ))}
            </div>
            {q.dfcStatement.conciliado.byCategory.length > 0 && (
              <div className="table-scroll">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-brand-100">
                      <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Classe</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Entradas</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Saídas</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Líquido</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Txns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.dfcStatement.conciliado.byCategory.map((line) => (
                      <tr key={`c__${line.category}__${line.cashflowClass}`} className="border-b border-brand-50 hover:bg-brand-50/40">
                        <td className="py-1.5 px-2 text-gray-700 font-medium">{line.categoryLabel}</td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            line.cashflowClass === "operacional"   ? "bg-emerald-100 text-emerald-700" :
                            line.cashflowClass === "investimento"  ? "bg-violet-100 text-violet-700" :
                            line.cashflowClass === "financiamento" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                          }`}>{line.cashflowClass}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-emerald-700">{line.entradas > 0 ? `+${fmtBRL(line.entradas)}` : "—"}</td>
                        <td className="py-1.5 px-2 text-right text-red-600">{line.saidas > 0 ? `−${fmtBRL(line.saidas)}` : "—"}</td>
                        <td className={`py-1.5 px-2 text-right font-bold ${line.liquido >= 0 ? "text-brand-700" : "text-red-700"}`}>
                          {line.liquido >= 0 ? "+" : ""}{fmtBRL(line.liquido)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-gray-400">{line.txCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Impacto Pendente — Classificado Aguardando Conciliação ────────── */}
        {q.hasData && q.dfcStatement.classificadoPendente.txCount > 0 && (
          <div className="card p-5 border-amber-200 bg-amber-50/20">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-500" />
              Impacto Pendente — Classificado Aguardando Conciliação
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">classificado</span>
            </h2>
            <p className="text-[11px] text-gray-400 mb-3">
              Transações com{" "}
              <code className="text-[10px] bg-gray-100 px-1 rounded">reconciliationStatus=classificado</code>{" "}
              — classificadas por regra mas aguardando revisão manual.{" "}
              <span className="font-medium text-amber-700">{q.dfcStatement.classificadoPendente.txCount} transações</span>{" "}
              <strong>não entram</strong> nos KPIs finais até conciliadas.{" "}
              <a href="/awq/reconciliation" className="underline text-brand-600 hover:text-brand-700">Revisar →</a>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                { label: "FCO Líquido",   value: q.dfcStatement.classificadoPendente.operacional.liquido,   color: "text-emerald-700" },
                { label: "FCInv Líquido", value: q.dfcStatement.classificadoPendente.investimento.liquido,  color: "text-violet-700"  },
                { label: "FCFin Líquido", value: q.dfcStatement.classificadoPendente.financiamento.liquido, color: "text-amber-700"   },
                { label: "Impacto Total", value: q.dfcStatement.classificadoPendente.variacaoCaixa, color: "text-amber-700" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <div className="text-[10px] text-gray-400">{item.label}</div>
                  <div className={`text-sm font-bold ${item.color}`}>
                    {item.value >= 0 ? "+" : ""}{fmtBRL(item.value)}
                  </div>
                </div>
              ))}
            </div>
            {q.dfcStatement.classificadoPendente.byCategory.length > 0 && (
              <div className="table-scroll">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-amber-100">
                      <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Classe</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Entradas</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Saídas</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Líquido</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Txns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.dfcStatement.classificadoPendente.byCategory.map((line) => (
                      <tr key={`p__${line.category}__${line.cashflowClass}`} className="border-b border-amber-50 hover:bg-amber-50/40">
                        <td className="py-1.5 px-2 text-gray-700 font-medium">{line.categoryLabel}</td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            line.cashflowClass === "operacional"   ? "bg-emerald-100 text-emerald-700" :
                            line.cashflowClass === "investimento"  ? "bg-violet-100 text-violet-700" :
                            line.cashflowClass === "financiamento" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                          }`}>{line.cashflowClass}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-emerald-700">{line.entradas > 0 ? `+${fmtBRL(line.entradas)}` : "—"}</td>
                        <td className="py-1.5 px-2 text-right text-red-600">{line.saidas > 0 ? `−${fmtBRL(line.saidas)}` : "—"}</td>
                        <td className={`py-1.5 px-2 text-right font-bold ${line.liquido >= 0 ? "text-amber-700" : "text-red-700"}`}>
                          {line.liquido >= 0 ? "+" : ""}{fmtBRL(line.liquido)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-gray-400">{line.txCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── DRE Gerencial — cash-basis proxy ─────────────────────────────── */}
        {q.hasData && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Activity size={15} className="text-brand-500" />
              DRE Gerencial — Visão de Caixa (proxy)
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Proxy de DRE cash-basis a partir de{" "}
              <code className="text-[10px] bg-gray-100 px-1 rounded">dreEffect</code>{" "}
              por transação — não é DRE accrual / competência.
              Lucro Líquido:{" "}
              <span className={`font-semibold ${q.dreStatement.lucroLiquido >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {q.dreStatement.lucroLiquido >= 0 ? "+" : ""}{fmtBRL(q.dreStatement.lucroLiquido)}
              </span>
              {q.dreStatement.receita > 0 && (
                <span className="ml-2 text-gray-500">
                  · Margem EBITDA:{" "}
                  <span className={q.dreStatement.ebitdaMargin >= 0 ? "text-emerald-700" : "text-red-600"}>
                    {(q.dreStatement.ebitdaMargin * 100).toFixed(1)}%
                  </span>
                </span>
              )}
            </p>
            <div className="space-y-1">
              {[
                { label: "Receita Bruta",         value:  q.dreStatement.receita,      indent: 0, bold: false, color: "text-emerald-600" },
                { label: "(−) Custo Direto",       value: -q.dreStatement.custo,        indent: 1, bold: false, color: "text-red-600"     },
                { label: "= Lucro Bruto",          value:  q.dreStatement.grossProfit,  indent: 0, bold: true,  color: q.dreStatement.grossProfit >= 0 ? "text-emerald-700" : "text-red-600" },
                { label: "(−) Despesas Operacionais (OpEx)", value: -q.dreStatement.opex, indent: 1, bold: false, color: "text-red-600" },
                { label: "= EBITDA",               value:  q.dreStatement.ebitda,       indent: 0, bold: true,  color: q.dreStatement.ebitda >= 0 ? "text-brand-700" : "text-red-600" },
                { label: "± Resultado Financeiro", value:  q.dreStatement.financeiro,   indent: 1, bold: false, color: q.dreStatement.financeiro >= 0 ? "text-violet-600" : "text-red-600" },
                { label: "(−) Impostos e Tributos",value: -q.dreStatement.imposto,      indent: 1, bold: false, color: "text-red-600"     },
                { label: "= Lucro Líquido",        value:  q.dreStatement.lucroLiquido, indent: 0, bold: true,  color: q.dreStatement.lucroLiquido >= 0 ? "text-gray-900" : "text-red-700" },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between ${row.bold ? "py-1 px-2 bg-gray-50 rounded-lg" : "px-2 py-0.5"}`}
                >
                  <span
                    className={`text-xs ${row.bold ? "font-bold text-gray-900" : "text-gray-500"}`}
                    style={{ paddingLeft: `${row.indent * 12}px` }}
                  >
                    {row.label}
                  </span>
                  <span className={`text-xs font-semibold ${row.color}`}>
                    {row.value >= 0 ? "+" : ""}{fmtBRL(row.value)}
                  </span>
                </div>
              ))}
              {q.dreStatement.pendente > 0 && (
                <div className="pt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                  <AlertCircle size={11} />
                  {fmtBRL(q.dreStatement.pendente)} com{" "}
                  <code className="text-[10px] bg-amber-50 px-1 rounded">dreEffect=null</code>{" "}
                  — não incluído nas linhas acima
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DRE por Categoria — detalhe auditável ─────────────────────────── */}
        {q.hasData && q.dreStatement.byCategory.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Activity size={15} className="text-brand-500" />
              DRE por Categoria — Detalhe Auditável
            </h2>
            <p className="text-[11px] text-gray-400 mb-3">
              Cada categoria com dreEffect ≠ nao_aplicavel. Positivo = receita/rendimento; negativo = custo/despesa.
            </p>
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Linha DRE</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Entidade</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Contribuição</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Txns</th>
                  </tr>
                </thead>
                <tbody>
                  {q.dreStatement.byCategory.map((line) => (
                    <tr key={`${line.category}__${line.dreEffect}`} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-1.5 px-2 text-gray-700 font-medium">{line.categoryLabel}</td>
                      <td className="py-1.5 px-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          line.dreEffect === "receita"    ? "bg-emerald-100 text-emerald-700" :
                          line.dreEffect === "custo"      ? "bg-red-100 text-red-700"         :
                          line.dreEffect === "opex"       ? "bg-orange-100 text-orange-700"   :
                          line.dreEffect === "financeiro" ? "bg-violet-100 text-violet-700"   :
                          line.dreEffect === "imposto"    ? "bg-amber-100 text-amber-700"     : "bg-gray-100 text-gray-600"
                        }`}>
                          {line.dreEffect}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-gray-400 text-[9px]">
                        {line.entity === "multi"
                          ? <span className="bg-gray-100 text-gray-500 px-1 rounded">multi</span>
                          : <span>{ENTITY_LABELS[line.entity as EntityLayer] ?? line.entity}</span>
                        }
                      </td>
                      <td className={`py-1.5 px-2 text-right font-bold ${line.total >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {line.total >= 0 ? "+" : ""}{fmtBRL(line.total)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-gray-400">{line.txCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Fila de Revisão — conciliação manual interativa ──────────────── */}
        {q.hasData && (() => {
          const reviewItems: ReviewItem[] = q.reconciliationQueue.topItems.map((item) => ({
            id:            item.id,
            date:          item.date,
            description:   item.description,
            amount:        item.amount,
            direction:     item.direction,
            entityLabel:   ENTITY_LABELS[item.entity] ?? item.entity,
            categoryId:    item.category,
            categoryLabel: CATEGORY_LABELS[item.category] ?? item.category,
            status:        item.status,
            note:          item.note,
            cashflowClass: item.cashflowClass,
            dreEffect:     item.dreEffect,
          }));
          return (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" />
                Fila de Revisão — Conciliação Bancária
              </h2>
              <div className="flex flex-wrap gap-4 mb-4">
                {[
                  { label: "Pendente",     value: q.reconciliationQueue.pendente,     color: "text-amber-600",  bg: "bg-amber-50"   },
                  { label: "Em Revisão",   value: q.reconciliationQueue.em_revisao,   color: "text-orange-600", bg: "bg-orange-50"  },
                  { label: "Classificado", value: q.reconciliationQueue.classificado, color: "text-emerald-600",bg: "bg-emerald-50" },
                  { label: "Conciliado",   value: q.reconciliationQueue.conciliado,   color: "text-brand-600",  bg: "bg-brand-50"   },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-lg px-3 py-2 text-center min-w-[80px]`}>
                    <div className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString("pt-BR")}</div>
                    <div className="text-[10px] text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <ReconciliationReviewTable items={reviewItems} />
            </div>
          );
        })()}

        {/* ── Cash Position per Account ────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Posição de Caixa por Conta
          </h2>
          {sortedAccounts.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhuma conta ingerida ainda.</p>
          ) : (
            <div className="space-y-4">
              {sortedAccounts.map((acc) => {
                const share = totalClosing !== 0
                  ? Math.abs(acc.closingBalance) / Math.abs(totalClosing) * 100
                  : 0;
                return (
                  <div key={acc.documentId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                        <span className="text-xs font-medium text-brand-700">
                          {acc.accountName}
                        </span>
                        <span className="text-[10px] text-gray-400">{ENTITY_LABELS[acc.entity]}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1">{acc.bank}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-400">
                          Entradas:{" "}
                          <span className="text-emerald-600 font-semibold">{fmtBRL(acc.totalCredits)}</span>
                        </span>
                        <span className={`font-bold ${acc.closingBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
                          {fmtBRL(acc.closingBalance)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${acc.closingBalance >= 0 ? "bg-brand-500" : "bg-red-400"}`}
                        style={{ width: `${Math.min(share, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5 text-[10px] text-gray-400">
                      <span>Abertura: {fmtBRL(acc.openingBalance)}</span>
                      <span>Saídas: {fmtBRL(acc.totalDebits)}</span>
                      <span>
                        Período: {fmtDate(acc.periodStart)} – {fmtDate(acc.periodEnd)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">Caixa Total (todas as contas)</span>
                <span className={`text-base font-bold ${totalClosing >= 0 ? "text-gray-900" : "text-red-600"}`}>
                  {fmtBRL(totalClosing)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Data Quality ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity size={15} className="text-brand-500" />
            Qualidade dos Dados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Documentos ingeridos",   value: q.dataQuality.doneDocuments   },
              { label: "Transações totais",       value: q.dataQuality.totalTransactions },
              { label: "Confirmadas",             value: q.dataQuality.confirmedCount  },
              { label: "Ambíguas",                value: q.dataQuality.ambiguousCount  },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-bold text-gray-900">{s.value.toLocaleString("pt-BR")}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {q.dataQuality.intercompanyPairs > 0 && (
            <p className="text-[11px] text-gray-400 mt-3">
              {q.dataQuality.intercompanyPairs} par(es) intercompany identificado(s) e eliminado(s) da consolidação.
            </p>
          )}
        </div>

        {/* ── Methodology disclaimer ───────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">Visão de Caixa</span> —
            Esta página apresenta fluxo de caixa na base de regime de caixa, não DRE accrual.
            Receitas = créditos classificados como receita_*. Despesas = débitos em categorias operacionais.
            Pró-labore, pessoais e movimentos financeiros são separados mas contidos nas saídas.
            Os dados são 100% originados dos extratos bancários ingeridos — sem mocks ou snapshots.
          </p>
        </div>

      </div>
    </>
  );
}

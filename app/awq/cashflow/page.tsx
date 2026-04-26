// ─── /awq/cashflow — Fluxo de Caixa Operacional ─────────────────────────────
// DATA SOURCE: financial-db.ts (canonical pipeline store) via financial-query.ts
// METHODOLOGY: Cash-basis — receipts and disbursements from ingested bank statements.
//              This is NOT a DRE / accrual P&L.  Label: "Visão de Caixa".
// NO MOCKS, NO SNAPSHOTS, NO HARDCODES.
// When hasData === false, render honest empty state.

import Header from "@/components/Header";
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
  type MonthlyEntry,
  type EntityLayer,
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
            <a href="/awq/conciliacao" className="underline font-medium">
              /awq/conciliacao
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
  // Note: partnerWithdrawals and personalExpenses are already contained in
  // totalExpenses and therefore in operationalNetCash. They are shown as
  // sub-lines for visibility but must NOT be subtracted again from the FCO total.
  const otherExpenses = c.totalExpenses - c.partnerWithdrawals - c.personalExpenses;
  const waterfallRows: { label: string; value: number; indent: number; bold: boolean }[] = [
    { label: "Entradas Operacionais",          value:  c.totalRevenue,          indent: 0, bold: false },
    { label: "  (−) Outras Saídas",           value: -otherExpenses,            indent: 1, bold: false },
    { label: "  (−) Pró-labore / Retiradas",  value: -c.partnerWithdrawals,     indent: 1, bold: false },
    { label: "  (−) Despesas Pessoais",       value: -c.personalExpenses,       indent: 1, bold: false },
    { label: "= FCO Caixa",                   value:  c.operationalNetCash,      indent: 0, bold: true  },
    { label: "  Elim. Intercompany",          value: -c.intercompanyEliminated,  indent: 1, bold: false },
    { label: "  Movimentos Financeiros (net)",value:  c.financialMovements,      indent: 1, bold: false },
    { label: "  Ambíguo (revisão pendente)",  value:  c.ambiguousAmount,         indent: 1, bold: false },
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

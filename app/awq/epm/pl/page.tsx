// ─── /awq/epm/pl — P&L (DRE Gerencial) ──────────────────────────────────────
//
// DATA SOURCE: buildDreQuery() from lib/dre-query.ts
//   Cash-basis P&L from ingested bank statements.
//   Falls back to snapshot from awq-derived-metrics for planning context.
//
// Structure:
//   Receita Bruta
//   (-) COGS             → Lucro Bruto
//   (-) OPEX             → EBITDA
//   (-) Despesas Financeiras → Resultado Líquido

import Header from "@/components/Header";
import Link from "next/link";
import {
  LineChart, AlertTriangle, Database, ChevronRight,
  TrendingUp, DollarSign, BarChart3, Target,
} from "lucide-react";
import { buildDreQuery, type DreResult } from "@/lib/dre-query";
import { consolidated, consolidatedMargins, BUDGET_LINES } from "@/lib/awq-derived-metrics";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function pctFmt(n: number | null): string {
  if (n === null) return "—";
  return (n * 100).toFixed(1) + "%";
}

// ─── DRE Line Row ─────────────────────────────────────────────────────────────

function DRE_Row({
  label,
  value,
  sub,
  indent = false,
  bold = false,
  colorClass = "text-gray-700",
  showPct,
  revenue,
}: {
  label:      string;
  value:      number;
  sub?:       string;
  indent?:    boolean;
  bold?:      boolean;
  colorClass?: string;
  showPct?:   boolean;
  revenue?:   number;
}) {
  const pct = showPct && revenue && revenue > 0
    ? " (" + ((Math.abs(value) / revenue) * 100).toFixed(1) + "%)"
    : "";

  return (
    <div className={`flex items-center justify-between py-2 ${indent ? "pl-6" : ""} ${
      bold ? "border-t border-gray-200 mt-1" : "border-b border-gray-50"
    }`}>
      <div className={`text-xs ${bold ? "font-bold text-gray-900" : "text-gray-600"}`}>
        {label}
        {sub && <span className="text-[10px] text-gray-400 ml-1.5">{sub}</span>}
      </div>
      <div className={`text-xs font-${bold ? "bold" : "semibold"} tabular-nums ${colorClass}`}>
        {value < 0 ? `(${fmtBRL(Math.abs(value))})` : fmtBRL(value)}{pct}
      </div>
    </div>
  );
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({
  lines,
  revenue,
  positive = true,
}: {
  lines: { label: string; amount: number; transactionCount: number }[];
  revenue?: number;
  positive?: boolean;
}) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-2 space-y-0.5 pl-4 border-l-2 border-gray-100">
      {lines.map((line) => {
        const pct = revenue && revenue > 0 ? (line.amount / revenue) * 100 : 0;
        return (
          <div key={line.label} className="flex items-center justify-between py-1">
            <span className="text-[11px] text-gray-500">{line.label}</span>
            <div className="flex items-center gap-3">
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${positive ? "bg-emerald-400" : "bg-red-400"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-gray-600 w-20 text-right">
                {fmtBRL(line.amount)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Snapshot Banner ─────────────────────────────────────────────────────────

function SnapshotBanner() {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-800">
        <span className="font-semibold">Sem dados bancários.</span>{" "}
        Os números abaixo são do <strong>snapshot de planejamento</strong> (accrual Q1 2026),
        não de extratos reais.{" "}
        <Link href="/awq/conciliacao" className="underline font-semibold">
          Ingerir extratos →
        </Link>
      </div>
    </div>
  );
}

// ─── Main DRE waterfall ───────────────────────────────────────────────────────

function DreWaterfall({ dre, snapRevenue }: { dre: DreResult; snapRevenue: number }) {
  const revenue = dre.hasData ? dre.dreRevenue : snapRevenue;
  const snap = consolidated;

  const cogs      = dre.hasData ? dre.dreCOGS            : snap.revenue - snap.grossProfit;
  const grossProfit= dre.hasData ? dre.dreGrossProfit     : snap.grossProfit;
  const opex      = dre.hasData ? dre.dreOperatingExpenses: snap.grossProfit - snap.ebitda;
  const ebitda    = dre.hasData ? dre.dreEBITDA           : snap.ebitda;
  const finExp    = dre.hasData ? dre.dreFinancialExpenses: 0;
  const netResult = dre.hasData ? dre.dreNetResult        : snap.netIncome;
  const gmPct     = revenue > 0 ? grossProfit / revenue  : null;
  const ebitdaPct = revenue > 0 ? ebitda / revenue        : null;
  const netPct    = revenue > 0 ? netResult / revenue     : null;

  return (
    <div className="card p-5 lg:p-6 space-y-1">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-900">DRE Gerencial — AWQ Group Consolidado</span>
        <span className="text-[10px] text-gray-400">
          {dre.hasData
            ? `${dre.periodStart?.slice(0,7)} → ${dre.periodEnd?.slice(0,7)}`
            : "Snapshot YTD 2026"}
        </span>
      </div>

      {/* RECEITA */}
      <DRE_Row
        label="(+) Receita Bruta"
        value={revenue}
        bold
        colorClass="text-emerald-700"
      />
      {dre.hasData && (
        <CategoryBreakdown
          lines={dre.revenueSections.lines}
          revenue={revenue}
          positive
        />
      )}

      {/* COGS */}
      <DRE_Row
        label="(-) Custo dos Serviços (COGS)"
        value={-cogs}
        indent
        colorClass="text-red-600"
        showPct
        revenue={revenue}
      />
      {dre.hasData && cogs > 0 && (
        <CategoryBreakdown
          lines={dre.cogsSections.lines}
          revenue={revenue}
          positive={false}
        />
      )}

      {/* LUCRO BRUTO */}
      <DRE_Row
        label="(=) Lucro Bruto"
        value={grossProfit}
        bold
        colorClass={grossProfit >= 0 ? "text-brand-700" : "text-red-700"}
        sub={gmPct !== null ? `Margem Bruta: ${pctFmt(gmPct)}` : undefined}
      />

      {/* OPEX */}
      <DRE_Row
        label="(-) Despesas Operacionais (OPEX)"
        value={-opex}
        indent
        colorClass="text-red-600"
        showPct
        revenue={revenue}
      />
      {dre.hasData && opex > 0 && (
        <CategoryBreakdown
          lines={dre.opexSections.lines}
          revenue={revenue}
          positive={false}
        />
      )}

      {/* EBITDA */}
      <DRE_Row
        label="(=) EBITDA"
        value={ebitda}
        bold
        colorClass={ebitda >= 0 ? "text-emerald-700" : "text-red-700"}
        sub={ebitdaPct !== null ? `Margem EBITDA: ${pctFmt(ebitdaPct)}` : undefined}
      />

      {/* DESPESAS FINANCEIRAS */}
      {finExp > 0 && (
        <DRE_Row
          label="(-) Despesas Financeiras"
          value={-finExp}
          indent
          colorClass="text-red-600"
        />
      )}

      {/* RESULTADO LÍQUIDO */}
      <DRE_Row
        label="(=) Resultado Líquido"
        value={netResult}
        bold
        colorClass={netResult >= 0 ? "text-emerald-800" : "text-red-700"}
        sub={netPct !== null ? `Margem Líquida: ${pctFmt(netPct)}` : undefined}
      />

      {/* BELOW THE LINE */}
      {dre.hasData && (dre.intercompanyEliminated > 0 || dre.financialApplications > 0) && (
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Itens excluídos do P&L
          </div>
          {dre.intercompanyEliminated > 0 && (
            <DRE_Row label="Intercompany eliminado" value={dre.intercompanyEliminated} colorClass="text-violet-600" />
          )}
          {dre.financialApplications > 0 && (
            <DRE_Row label="Aplicações financeiras" value={-dre.financialApplications} colorClass="text-gray-400" />
          )}
          {dre.financialRedemptions > 0 && (
            <DRE_Row label="Resgates financeiros" value={dre.financialRedemptions} colorClass="text-gray-400" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Budget comparison ────────────────────────────────────────────────────────

function BudgetComparison() {
  const snap = consolidated;

  function sumBudg(name: string) {
    const bl = BUDGET_LINES.find((l) => l.line === name);
    return bl ? bl.jacquesBudg + bl.cazaBudg + bl.advisorBudg : 0;
  }
  function sumActual(name: string) {
    const bl = BUDGET_LINES.find((l) => l.line === name);
    return bl ? bl.jacquesActual + bl.cazaActual + bl.advisorActual : 0;
  }
  function variance(actual: number, budget: number) {
    return { variance: actual - budget, variancePct: budget !== 0 ? ((actual - budget) / Math.abs(budget)) * 100 : 0 };
  }

  const budgEbitda = sumBudg("EBITDA");
  const actlEbitda = sumActual("EBITDA");
  const budgNet    = sumBudg("Lucro Líquido");
  const actlNet    = sumActual("Lucro Líquido");

  const rows = [
    { label: "Receita",   actual: snap.revenue,    budget: snap.budgetRevenue, ...variance(snap.revenue,    snap.budgetRevenue) },
    { label: "EBITDA",    actual: actlEbitda,       budget: budgEbitda,         ...variance(actlEbitda,       budgEbitda)         },
    { label: "Resultado", actual: actlNet,          budget: budgNet,            ...variance(actlNet,          budgNet)            },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Budget vs Actual — YTD 2026</h2>
        <Link href="/awq/epm/budget" className="text-xs text-brand-600 hover:underline">Detalhes →</Link>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-2 px-2 text-gray-500 font-semibold">Linha</th>
              <th className="py-2 px-2 text-gray-500 font-semibold text-right">Actual</th>
              <th className="py-2 px-2 text-gray-500 font-semibold text-right">Budget</th>
              <th className="py-2 px-2 text-gray-500 font-semibold text-right">Variância</th>
              <th className="py-2 px-2 text-gray-500 font-semibold text-right">Var %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const positive = row.variance >= 0;
              return (
                <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-800">{row.label}</td>
                  <td className="py-2 px-2 text-right font-semibold tabular-nums">{fmtBRL(row.actual)}</td>
                  <td className="py-2 px-2 text-right text-gray-500 tabular-nums">{fmtBRL(row.budget)}</td>
                  <td className={`py-2 px-2 text-right font-semibold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>
                    {positive ? "+" : ""}{fmtBRL(row.variance)}
                  </td>
                  <td className={`py-2 px-2 text-right font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
                    {positive ? "+" : ""}{row.variancePct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EpmPLPage() {
  const dre = await buildDreQuery("all");

  return (
    <>
      <Header
        title="P&L — DRE Gerencial"
        subtitle={dre.hasData
          ? `Base bancária real · ${dre.periodStart?.slice(0,7)} → ${dre.periodEnd?.slice(0,7)}`
          : "Snapshot de planejamento · aguardando extratos"}
      />
      <div className="page-container">

        {!dre.hasData && <SnapshotBanner />}

        {/* ── Header metrics ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Receita Bruta",  value: dre.hasData ? dre.dreRevenue        : consolidated.revenue,   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Margem Bruta",   value: dre.hasData ? (dre.dreGrossMargin != null ? `${(dre.dreGrossMargin*100).toFixed(1)}%` : "—") : `${(consolidatedMargins.grossMargin*100).toFixed(1)}%`, icon: BarChart3, color: "text-brand-600", bg: "bg-brand-50", isString: true },
            { label: "EBITDA",         value: dre.hasData ? dre.dreEBITDA          : consolidated.ebitda,    icon: Target,     color: (dre.hasData ? dre.dreEBITDA : consolidated.ebitda) >= 0 ? "text-emerald-600" : "text-red-600", bg: (dre.hasData ? dre.dreEBITDA : consolidated.ebitda) >= 0 ? "bg-emerald-50" : "bg-red-50" },
            { label: "Margem EBITDA",  value: dre.hasData ? (dre.dreEBITDAMargin != null ? `${(dre.dreEBITDAMargin*100).toFixed(1)}%` : "—") : `${(consolidatedMargins.ebitdaMargin*100).toFixed(1)}%`, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50", isString: true },
          ].map((card) => {
            const Icon = card.icon;
            const display = (card as { isString?: boolean }).isString
              ? String(card.value)
              : fmtBRL(Number(card.value));
            return (
              <div key={card.label} className="card p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{display}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DRE Waterfall ──────────────────────────────────────────── */}
        <DreWaterfall dre={dre} snapRevenue={consolidated.revenue} />

        {/* ── Budget vs Actual ───────────────────────────────────────── */}
        <BudgetComparison />

        {/* ── Data quality ───────────────────────────────────────────── */}
        {dre.hasData && dre.ambiguousCount > 0 && (
          <div className="card p-4 border-l-4 border-amber-400">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={13} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">
                {dre.ambiguousCount} transações ambíguas — podem impactar a DRE
              </span>
            </div>
            <p className="text-xs text-amber-700">
              Transações classificadas como &quot;ambíguo&quot; estão incluídas nos totais acima mas podem estar
              mal categorizadas. Revise via{" "}
              <Link href="/awq/conciliacao" className="underline font-medium">Conciliação</Link>.
            </p>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="flex items-center gap-1 text-brand-600 hover:underline">
            ← EPM Overview
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/balance-sheet" className="flex items-center gap-1 text-brand-600 hover:underline">
            Balanço Patrimonial <ChevronRight size={11} />
          </Link>
          <Link href="/awq/epm/budget" className="flex items-center gap-1 text-brand-600 hover:underline">
            Budget vs Actual <ChevronRight size={11} />
          </Link>
        </div>

      </div>
    </>
  );
}

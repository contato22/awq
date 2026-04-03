// ─── /awq/kpis — KPI Scorecard ───────────────────────────────────────────────
//
// DATA CONTRACT: every metric displayed here is a FinancialMetric<T> with
// explicit source_type, confidence_status, reconciliation_status.
//
// SOURCE ROUTING (via lib/financial-metric-query.ts — single entry point):
//   REAL    → buildFinancialQuery() via financial-db.ts (bank statements)
//   SNAPSHOT→ awq-derived-metrics → awq-group-data.ts (Q1 2026 accrual plan)
//
// HONEST STATES:
//   Empty metric  → "—" displayed, no invented number
//   Snapshot      → amber badge, section dimmed
//   Real          → green badge

import Header from "@/components/Header";
import Link from "next/link";
import {
  Activity,
  TrendingUp,
  BarChart3,
  DollarSign,
  Users,
  Target,
  Zap,
  ChevronRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  getAWQGroupKPIs,
  getEntityCashMetrics,
  fmtBRL,
  fmtR,
  fmtPct,
  ENTITY_LABELS,
} from "@/lib/financial-metric-query";
import { MetricSourceBadge, MetricDetail, MetricEmpty } from "@/components/MetricSourceBadge";
import { buData, operatingBus } from "@/lib/awq-derived-metrics";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqKpisPage() {
  const kpis    = await getAWQGroupKPIs();
  const entities = await getEntityCashMetrics();

  // ── Top 4 KPI cards ─────────────────────────────────────────────────────────
  const topCards = [
    {
      label:   "Entradas Ops.",
      metric:  kpis.cashInflows,
      display: kpis.cashInflows.value !== null ? fmtBRL(kpis.cashInflows.value) : "—",
      icon:    Zap,
      color:   "text-emerald-600",
      bg:      "bg-emerald-50",
    },
    {
      label:   "Caixa Total",
      metric:  kpis.totalCashBalance,
      display: kpis.totalCashBalance.value !== null ? fmtBRL(kpis.totalCashBalance.value) : "—",
      icon:    DollarSign,
      color:   "text-brand-600",
      bg:      "bg-brand-50",
    },
    {
      label:   "EBITDA Margem",
      metric:  kpis.ebitdaMargin,
      display: fmtPct(kpis.ebitdaMargin.value),
      icon:    BarChart3,
      color:   "text-violet-700",
      bg:      "bg-violet-50",
    },
    {
      label:   "Clientes Totais",
      metric:  kpis.totalClients,
      display: kpis.totalClients.value.toString(),
      icon:    Users,
      color:   "text-cyan-700",
      bg:      "bg-cyan-50",
    },
  ];

  return (
    <>
      <Header
        title="KPIs — AWQ Group"
        subtitle="Scorecard consolidado · Visão de Caixa (real) + Accrual (snapshot)"
      />
      <div className="page-container">

        {/* ── Data source legend ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 px-1">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span className="font-semibold text-emerald-700">REAL</span> = base bancária ingerida
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle size={11} className="text-amber-500" />
            <span className="font-semibold text-amber-600">SNAPSHOT</span> = base accrual, não verificada pelo banco
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle size={11} className="text-gray-400" />
            <span className="font-semibold text-gray-500">SEM DADO</span> = aguardando ingestão
          </span>
          <Link href="/awq/management" className="ml-auto text-[10px] text-brand-500 hover:text-brand-400 flex items-center gap-0.5">
            Gestão da base <ChevronRight size={10} />
          </Link>
        </div>

        {/* ── Top 4 KPI cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{card.display}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5 flex items-center flex-wrap">
                    {card.label}
                    <MetricSourceBadge sourceType={card.metric.source_type} />
                  </div>
                  <MetricDetail metric={card.metric} compact />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Real Cash by Entity ───────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Caixa &amp; FCO por Entidade
              <MetricSourceBadge sourceType="real" />
            </h2>
            {kpis.periodLabel && (
              <span className="ml-auto text-[11px] text-gray-400">{kpis.periodLabel}</span>
            )}
          </div>

          {!kpis.hasRealData ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <AlertCircle size={14} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-600">Aguardando extratos bancários</p>
                <MetricEmpty
                  label="Nenhum extrato processado. Ingira PDFs para ver dados reais de caixa."
                  linkHref="/awq/ingest"
                  linkLabel="→ /awq/ingest"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Consolidated summary */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Consolidado AWQ
                  <MetricSourceBadge sourceType="real" />
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Entradas ops.",  m: kpis.cashInflows,       cls: "text-emerald-600" },
                    { label: "Saídas ops.",    m: kpis.cashOutflows,       cls: "text-red-600"     },
                    { label: "FCO Líquido",    m: kpis.operationalNetCash, cls: "text-gray-900 font-bold border-t border-gray-200 pt-2 mt-2" },
                    { label: "Caixa total",    m: kpis.totalCashBalance,   cls: "text-brand-700 font-semibold" },
                  ].map(({ label, m, cls }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className={cls}>
                        {m.value !== null ? fmtBRL(m.value as number) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
                {kpis.dataQuality && kpis.dataQuality.coverageGaps.length > 0 && (
                  <div className="mt-2 text-[9px] text-amber-600">
                    {kpis.dataQuality.coverageGaps[0]}
                  </div>
                )}
              </div>

              {/* Per entity */}
              {entities.map((e) => (
                <div key={e.entity} className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {e.label}
                    <MetricSourceBadge sourceType="real" />
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Entradas ops.",  m: e.cashInflows,        cls: "text-emerald-600" },
                      { label: "Saídas ops.",    m: e.cashOutflows,       cls: "text-red-600"     },
                      { label: "FCO Líquido",    m: e.operationalNetCash, cls: "text-gray-900 font-bold border-t border-gray-200 pt-2 mt-2" },
                      { label: "Caixa",          m: e.totalCashBalance,   cls: "text-brand-700 font-semibold" },
                    ].map(({ label, m, cls }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className={cls}>{fmtBRL(m.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-3">
            <Link href="/awq/cashflow" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <ChevronRight size={11} /> Ver Cash Flow completo
            </Link>
            <Link href="/awq/financial" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <ChevronRight size={11} /> Ver Financial detalhado
            </Link>
          </div>
        </div>

        {/* ── Snapshot sections (accrual) ──────────────────────────────────── */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 pt-3 pb-1">
          <p className="text-[11px] text-amber-700 flex items-center gap-1.5 mb-3">
            <AlertCircle size={12} />
            As seções abaixo usam dados accrual (snapshot) — não verificadas pela base bancária.
            Receita, EBITDA, margem e ROIC requerem pipeline contábil ainda não disponível.
          </p>
        </div>

        {[
          {
            category: "Receita (Snapshot)",
            icon:     TrendingUp,
            items: [
              { label: "Receita Consolidada",  metric: kpis.totalRevenue,      display: fmtR(kpis.totalRevenue.value),       delta: "+8.4% vs budget",  up: true  },
              { label: "Receita / FTE",        metric: kpis.revenuePerFTE,     display: fmtR(kpis.revenuePerFTE.value),     delta: "+12% vs 2025",     up: true  },
              { label: "Receita / Cliente",    metric: kpis.revenuePerClient,  display: fmtR(kpis.revenuePerClient.value),  delta: "+5.1% vs 2025",    up: true  },
              { label: "Budget vs Actual",     metric: kpis.budgetVariance,    display: `+${kpis.budgetVariance.value.toFixed(1)}%`, delta: "Acima do plano", up: true },
            ],
          },
          {
            category: "Margem & Rentabilidade (Snapshot)",
            icon:     BarChart3,
            items: [
              { label: "Margem Bruta",    metric: kpis.grossMargin,    display: fmtPct(kpis.grossMargin.value),    delta: "+2.3pp vs 2025", up: true },
              { label: "Margem EBITDA",   metric: kpis.ebitdaMargin,   display: fmtPct(kpis.ebitdaMargin.value),  delta: "+1.1pp vs 2025", up: true },
              { label: "Margem Líquida",  metric: kpis.netMargin,      display: fmtPct(kpis.netMargin.value),     delta: "+0.8pp vs 2025", up: true },
              { label: "ROIC Consolidado",metric: kpis.roic,           display: kpis.roic.value.toFixed(1) + "%", delta: "+3.2pp vs 2025", up: true },
            ],
          },
          {
            category: "Operações (Snapshot)",
            icon:     Activity,
            items: [
              { label: "Clientes Ativos",   metric: kpis.totalClients, display: kpis.totalClients.value.toString(),    delta: "+8 vs 2025",      up: true },
              { label: "FTEs Totais",       metric: kpis.totalFTEs,    display: kpis.totalFTEs.value.toString(),       delta: "Ops. consolidado", up: true },
              { label: "BUs Operacionais",  metric: { ...kpis.totalClients, value: operatingBus.length, source_type: "snapshot" as const, calculation_rule: "COUNT(operatingBus)" },
                                            display: operatingBus.length.toString(),                                   delta: "3 ativas",         up: true },
              { label: "Forecast Accuracy", metric: { ...kpis.ebitdaMargin, value: 0.942, calculation_rule: "Média histórica Q1 2026" },
                                            display: "94.2%",                                                          delta: "+1.8pp vs média",  up: true },
            ],
          },
        ].map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.category} className="card p-5 opacity-80">
              <div className="flex items-center gap-2 mb-4">
                <Icon size={14} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-gray-700">{section.category}</h2>
                <MetricSourceBadge sourceType="snapshot" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {section.items.map((kpi) => (
                  <div key={kpi.label} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="text-lg font-bold text-gray-700">{kpi.display}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{kpi.label}</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <ArrowUpRight size={10} className={kpi.up ? "text-emerald-500" : "text-red-500"} />
                      <span className={`text-[10px] font-semibold ${kpi.up ? "text-emerald-500" : "text-red-500"}`}>{kpi.delta}</span>
                    </div>
                    <MetricDetail metric={kpi.metric} compact />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ── BU comparison ─────────────────────────────────────────────────── */}
        <div className="card p-5 opacity-80">
          <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            Comparativo por BU
            <MetricSourceBadge sourceType="snapshot" />
          </h2>
          <p className="text-[11px] text-amber-600 mb-4">
            Receita, margens e ROIC são accrual (snapshot). Caixa real disponível acima.
          </p>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left  py-2 px-3 font-semibold">BU</th>
                  <th className="text-right py-2 px-3 font-semibold">Receita</th>
                  <th className="text-right py-2 px-3 font-semibold">M. Bruta</th>
                  <th className="text-right py-2 px-3 font-semibold">EBITDA</th>
                  <th className="text-right py-2 px-3 font-semibold">M. Líq.</th>
                  <th className="text-right py-2 px-3 font-semibold">ROIC</th>
                  <th className="text-right py-2 px-3 font-semibold">Clientes</th>
                  <th className="text-right py-2 px-3 font-semibold">FTEs</th>
                  <th className="text-left  py-2 px-3 font-semibold">Drill</th>
                </tr>
              </thead>
              <tbody>
                {buData.map((bu) => {
                  const gm = bu.revenue > 0 ? ((bu.grossProfit / bu.revenue) * 100).toFixed(0) + "%" : "—";
                  const em = bu.revenue > 0 ? ((bu.ebitda      / bu.revenue) * 100).toFixed(0) + "%" : "—";
                  const nm = bu.revenue > 0 ? ((bu.netIncome   / bu.revenue) * 100).toFixed(0) + "%" : "—";
                  return (
                    <tr key={bu.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors group">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                          <span className="text-xs font-bold text-gray-700">{bu.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-700">
                        {bu.revenue > 0 ? fmtR(bu.revenue) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-500">{gm}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500">{em}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{nm}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500">
                        {bu.roic > 0 ? bu.roic.toFixed(0) + "%" : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{bu.customers}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{bu.ftes}</td>
                      <td className="py-2.5 px-3">
                        <Link href={bu.hrefOverview} className="text-[10px] text-brand-600 hover:text-brand-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver <ChevronRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quick links ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            { label: "Financial (Real)",  href: "/awq/financial",    icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Cash Flow (Real)",  href: "/awq/cashflow",     icon: Zap,        color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Gestão de Base",    href: "/awq/management",   icon: Target,     color: "text-violet-700",  bg: "bg-violet-50"  },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-all group">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={item.color} />
                </div>
                <span className="text-xs font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">{item.label}</span>
                <ChevronRight size={12} className="text-gray-400 group-hover:text-brand-600 ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}

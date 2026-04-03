// ─── /awq/kpis — KPI Scorecard ───────────────────────────────────────────────
// REAL cash metrics: financial-query.ts (pipeline)
// SNAPSHOT accrual metrics: awq-group-data.ts — clearly labelled.
// Accrual P&L (revenue, EBITDA, margins, ROIC) is NOT derivable from banking
// statements. The banking base supplies cash-basis data only.

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
  Database,
} from "lucide-react";
import {
  buData,
  operatingBus,
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
} from "@/lib/awq-group-data";
import {
  buildFinancialQuery,
  fmtBRL,
  fmtDate,
  ENTITY_LABELS,
} from "@/lib/financial-query";

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number) { return (n * 100).toFixed(1) + "%"; }

function RealBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 ml-1">
      <Database size={7} /> REAL
    </span>
  );
}

function SnapshotBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 ml-1">
      SNAPSHOT
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqKpisPage() {
  const q = buildFinancialQuery();
  const c = q.consolidated;

  const periodLabel = c.periodStart && c.periodEnd
    ? `${fmtDate(c.periodStart)} – ${fmtDate(c.periodEnd)}`
    : null;

  // ── Top 4 KPI cards — 2 real + 2 snapshot ───────────────────────────────────
  const topCards = [
    {
      label:  "Entradas Ops. (Real)",
      value:  q.hasData ? fmtBRL(c.totalRevenue)         : "—",
      icon:   Zap,
      color:  "text-emerald-600",
      bg:     "bg-emerald-50",
      isReal: true,
    },
    {
      label:  "Caixa Total (Real)",
      value:  q.hasData ? fmtBRL(c.totalCashBalance)     : "—",
      icon:   DollarSign,
      color:  "text-brand-600",
      bg:     "bg-brand-50",
      isReal: true,
    },
    {
      label:  "EBITDA Margem",
      value:  pct(consolidatedMargins.ebitdaMargin),
      icon:   BarChart3,
      color:  "text-violet-700",
      bg:     "bg-violet-50",
      isReal: false,
    },
    {
      label:  "Clientes Totais",
      value:  consolidated.customers.toString(),
      icon:   Users,
      color:  "text-cyan-700",
      bg:     "bg-cyan-50",
      isReal: false,
    },
  ];

  // ── Cash metrics by entity (real) ─────────────────────────────────────────
  const operationalEntities = q.entities.filter((e) =>
    ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity)
  );

  // ── Snapshot scorecard sections (accrual) ──────────────────────────────────
  const snapshotSections = [
    {
      category: "Receita (Snapshot)",
      items: [
        { label: "Receita Consolidada",  value: fmtR(consolidated.revenue),  delta: "+8.4% vs budget",  up: true  },
        { label: "Receita / FTE",        value: fmtR(Math.round(consolidated.revenue / consolidated.ftes)), delta: "+12% vs 2025", up: true },
        { label: "Receita / Cliente",    value: fmtR(Math.round(consolidated.revenue / consolidated.customers)), delta: "+5.1% vs 2025", up: true },
        { label: "Budget vs Actual",     value: `+${budgetVsActual.toFixed(1)}%`, delta: "Acima do plano", up: true },
      ],
    },
    {
      category: "Margem & Rentabilidade (Snapshot)",
      items: [
        { label: "Margem Bruta",    value: pct(consolidatedMargins.grossMargin),  delta: "+2.3pp vs 2025", up: true },
        { label: "Margem EBITDA",   value: pct(consolidatedMargins.ebitdaMargin), delta: "+1.1pp vs 2025", up: true },
        { label: "Margem Líquida",  value: pct(consolidatedMargins.netMargin),    delta: "+0.8pp vs 2025", up: true },
        { label: "ROIC Consolidado",value: `${consolidatedRoic.toFixed(1)}%`,     delta: "+3.2pp vs 2025", up: true },
      ],
    },
    {
      category: "Operações (Snapshot)",
      items: [
        { label: "Clientes Ativos",   value: consolidated.customers.toString(),  delta: "+8 vs 2025",      up: true  },
        { label: "FTEs Totais",       value: consolidated.ftes.toString(),        delta: "Ops. consolidado", up: true  },
        { label: "BUs Operacionais",  value: operatingBus.length.toString(),      delta: "3 ativas",         up: true  },
        { label: "Forecast Accuracy", value: "94.2%",                            delta: "+1.8pp vs média",  up: true  },
      ],
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
        <div className="flex items-center gap-4 text-[11px] text-gray-500 px-1">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span className="font-semibold text-emerald-700">REAL</span> = base bancária ingerida
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle size={11} className="text-amber-500" />
            <span className="font-semibold text-amber-600">SNAPSHOT</span> = base accrual, não verificada pelo banco
          </span>
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
                <div>
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5 flex items-center">
                    {card.label}
                    {card.isReal ? <RealBadge /> : <SnapshotBadge />}
                  </div>
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
              <RealBadge />
            </h2>
            {periodLabel && (
              <span className="ml-auto text-[11px] text-gray-400">{periodLabel}</span>
            )}
          </div>

          {!q.hasData ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Aguardando extratos bancários</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  Ingira PDFs em{" "}
                  <a href="/awq/ingest" className="underline">awq/ingest</a>{" "}
                  para ver os dados reais de caixa.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Consolidated */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Consolidado AWQ</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Entradas ops.</span>
                    <span className="text-emerald-600 font-semibold">{fmtBRL(c.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Saídas ops.</span>
                    <span className="text-red-600">{fmtBRL(c.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                    <span className="font-semibold text-gray-700">FCO Líquido</span>
                    <span className={`font-bold ${c.operationalNetCash >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {fmtBRL(c.operationalNetCash)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Caixa total</span>
                    <span className="font-semibold text-brand-700">{fmtBRL(c.totalCashBalance)}</span>
                  </div>
                </div>
              </div>
              {/* Per entity */}
              {operationalEntities.map((e) => (
                <div key={e.entity} className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {ENTITY_LABELS[e.entity]}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Entradas ops.</span>
                      <span className="text-emerald-600 font-semibold">{fmtBRL(e.operationalRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Saídas ops.</span>
                      <span className="text-red-600">{fmtBRL(e.operationalExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                      <span className="font-semibold text-gray-700">FCO Líquido</span>
                      <span className={`font-bold ${e.operationalNetCash >= 0 ? "text-gray-900" : "text-red-600"}`}>
                        {fmtBRL(e.operationalNetCash)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Caixa</span>
                      <span className="font-semibold text-brand-700">{fmtBRL(e.totalCashBalance)}</span>
                    </div>
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
            Receita, EBITDA, margem e ROIC requerem camada contábil que ainda não está no pipeline.
          </p>
        </div>

        {snapshotSections.map((section) => (
          <div key={section.category} className="card p-5 opacity-80">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-gray-700">{section.category}</h2>
              <SnapshotBadge />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((kpi) => (
                <div key={kpi.label} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-lg font-bold text-gray-700">{kpi.value}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{kpi.label}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <ArrowUpRight size={10} className={kpi.up ? "text-emerald-500" : "text-red-500"} />
                    <span className={`text-[10px] font-semibold ${kpi.up ? "text-emerald-500" : "text-red-500"}`}>
                      {kpi.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── BU comparison (accrual snapshot) ─────────────────────────────── */}
        <div className="card p-5 opacity-80">
          <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            Comparativo por BU
            <SnapshotBadge />
          </h2>
          <p className="text-[11px] text-amber-600 mb-4">
            Receita, margens e ROIC são accrual (snapshot). Caixa está disponível na base real acima.
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
            { label: "Investimentos",     href: "/awq/investments",  icon: Target,     color: "text-violet-700",  bg: "bg-violet-50"  },
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

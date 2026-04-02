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
} from "lucide-react";
import {
  buData,
  operatingBus,
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
} from "@/lib/awq-group-data";

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number) { return (n * 100).toFixed(1) + "%"; }

// ─── KPI scorecard definitions ────────────────────────────────────────────────

const groupKpis = [
  {
    category: "Receita",
    items: [
      { label: "Receita Consolidada",   value: fmtR(consolidated.revenue),          delta: "+8.4% vs budget",    up: true  },
      { label: "Receita / FTE",          value: fmtR(Math.round(consolidated.revenue / consolidated.ftes)), delta: "+12% vs 2025", up: true },
      { label: "Receita / Cliente",      value: fmtR(Math.round(consolidated.revenue / consolidated.customers)), delta: "+5.1% vs 2025", up: true },
      { label: "Budget vs Actual",       value: `+${budgetVsActual.toFixed(1)}%`,    delta: "Acima do plano",     up: true  },
    ],
  },
  {
    category: "Margem & Rentabilidade",
    items: [
      { label: "Margem Bruta",       value: pct(consolidatedMargins.grossMargin),  delta: "+2.3pp vs 2025",   up: true  },
      { label: "Margem EBITDA",      value: pct(consolidatedMargins.ebitdaMargin), delta: "+1.1pp vs 2025",   up: true  },
      { label: "Margem Líquida",     value: pct(consolidatedMargins.netMargin),    delta: "+0.8pp vs 2025",   up: true  },
      { label: "ROIC Consolidado",   value: `${consolidatedRoic.toFixed(1)}%`,     delta: "+3.2pp vs 2025",   up: true  },
    ],
  },
  {
    category: "Caixa & Capital",
    items: [
      { label: "Caixa Consolidado",  value: fmtR(consolidated.cashBalance),        delta: "Todas as BUs",     up: true  },
      { label: "Cash Gerado (Ops)",  value: fmtR(consolidated.cashGenerated),       delta: "+21.4% vs 2025",   up: true  },
      { label: "Capital Alocado",    value: fmtR(consolidated.capitalAllocated),    delta: "Portfólio total",  up: true  },
      { label: "Free Cash Flow",     value: fmtR(consolidated.cashGenerated - 92_000), delta: "+18.9% vs 2025", up: true },
    ],
  },
  {
    category: "Operações",
    items: [
      { label: "Clientes Ativos",    value: consolidated.customers.toString(),      delta: "+8 vs 2025",       up: true  },
      { label: "FTEs Totais",        value: consolidated.ftes.toString(),           delta: "Ops. consolidado", up: true  },
      { label: "BUs Operacionais",   value: operatingBus.length.toString(),         delta: "3 ativas",         up: true  },
      { label: "Forecast Accuracy",  value: "94.2%",                               delta: "+1.8pp vs média",  up: true  },
    ],
  },
];

// ─── Per-BU scorecard ─────────────────────────────────────────────────────────

export default function AwqKpisPage() {
  return (
    <>
      <Header
        title="KPIs — AWQ Group"
        subtitle="Scorecard consolidado · Jan–Mar 2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Top-level metrics ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Receita YTD",    value: fmtR(consolidated.revenue),              icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "EBITDA Margem",  value: pct(consolidatedMargins.ebitdaMargin),   icon: BarChart3,  color: "text-violet-700",  bg: "bg-violet-50"  },
            { label: "ROIC",           value: `${consolidatedRoic.toFixed(1)}%`,        icon: TrendingUp, color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Clientes",       value: consolidated.customers.toString(),        icon: Users,      color: "text-cyan-700",    bg: "bg-cyan-50"    },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={c.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{c.value}</div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">{c.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── KPI Scorecard by Category ──────────────────────────────────────── */}
        {groupKpis.map((section) => (
          <div key={section.category} className="card-elevated p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-gray-500" />
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">{section.category}</h2>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {section.items.map((kpi) => (
                <div key={kpi.label} className="p-3 rounded-xl bg-gray-100 border border-gray-200">
                  <div className="text-lg font-bold text-slate-800">{kpi.value}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{kpi.label}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <ArrowUpRight size={10} className={kpi.up ? "text-emerald-600" : "text-red-600"} />
                    <span className={`text-[10px] font-semibold ${kpi.up ? "text-emerald-600" : "text-red-600"}`}>
                      {kpi.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── BU KPI Comparison ──────────────────────────────────────────────── */}
        <div className="card-elevated p-5">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4">Comparativo KPIs por BU</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left  py-2 px-3 font-bold text-white">BU</th>
                  <th className="text-right py-2 px-3 font-bold text-white">Receita</th>
                  <th className="text-right py-2 px-3 font-bold text-white">M. Bruta</th>
                  <th className="text-right py-2 px-3 font-bold text-white">EBITDA</th>
                  <th className="text-right py-2 px-3 font-bold text-white">M. Líq.</th>
                  <th className="text-right py-2 px-3 font-bold text-white">ROIC</th>
                  <th className="text-right py-2 px-3 font-bold text-white">Clientes</th>
                  <th className="text-right py-2 px-3 font-bold text-white">FTEs</th>
                  <th className="text-left  py-2 px-3 font-bold text-white">Drill</th>
                </tr>
              </thead>
              <tbody>
                {buData.map((bu) => {
                  const gm = bu.revenue > 0 ? ((bu.grossProfit / bu.revenue) * 100).toFixed(0) + "%" : "—";
                  const em = bu.revenue > 0 ? ((bu.ebitda      / bu.revenue) * 100).toFixed(0) + "%" : "—";
                  const nm = bu.revenue > 0 ? ((bu.netIncome   / bu.revenue) * 100).toFixed(0) + "%" : "—";
                  return (
                    <tr key={bu.id} className="border-b border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-gray-100/60 transition-colors group">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                          <span className="text-xs font-bold text-slate-800">{bu.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {bu.revenue > 0 ? fmtR(bu.revenue) : <span className="text-gray-500">—</span>}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-semibold ${bu.revenue > 0 && bu.grossProfit / bu.revenue >= 0.55 ? "text-emerald-600" : "text-amber-700"}`}>{gm}</td>
                      <td className={`py-2.5 px-3 text-right font-semibold ${bu.revenue > 0 && bu.ebitda / bu.revenue >= 0.20 ? "text-emerald-600" : "text-amber-700"}`}>{em}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500">{nm}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${bu.roic >= 30 ? "text-emerald-600" : bu.roic >= 15 ? "text-amber-700" : "text-gray-500"}`}>
                        {bu.roic > 0 ? bu.roic.toFixed(0) + "%" : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-500">{bu.customers}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500">{bu.ftes}</td>
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
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            { label: "Financial",   href: "/awq/financial",   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Allocations", href: "/awq/allocations", icon: Target,     color: "text-amber-700",   bg: "bg-amber-50"   },
            { label: "Risk",        href: "/awq/risk",         icon: Zap,        color: "text-red-600",     bg: "bg-red-50"     },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-all group">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={item.color} />
                </div>
                <span className="text-xs font-semibold text-slate-800 group-hover:text-brand-500 transition-colors">{item.label}</span>
                <ChevronRight size={12} className="text-gray-500 group-hover:text-brand-600 ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}

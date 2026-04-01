import Header from "@/components/Header";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Activity,
  Wallet,
  Target,
  Building2,
  Scale,
} from "lucide-react";
import {
  buData,
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
  riskSignals,
  allocFlags,
  flagConfig,
  monthlyRevenue,
} from "@/lib/awq-group-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number) { return (n * 100).toFixed(1) + "%"; }

const severityConfig = {
  high:   { color: "text-red-600",    bg: "bg-red-50 border border-red-200",    dot: "bg-red-500"    },
  medium: { color: "text-amber-700",  bg: "bg-amber-50 border border-amber-200", dot: "bg-amber-500"  },
  low:    { color: "text-brand-600",  bg: "bg-brand-50 border border-brand-200", dot: "bg-brand-500"  },
};

// ─── Executive Summary Cards ──────────────────────────────────────────────────

const execCards = [
  {
    label: "Receita Consolidada",
    value: fmtR(consolidated.revenue),
    sub:   "Ops YTD Jan–Mar/26",
    delta: `+${budgetVsActual.toFixed(1)}% vs budget`,
    up:    true,
    icon:  DollarSign,
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
  },
  {
    label: "Lucro Bruto",
    value: fmtR(consolidated.grossProfit),
    sub:   `Margem ${pct(consolidatedMargins.grossMargin)}`,
    delta: "+2.3pp vs 2025",
    up:    true,
    icon:  TrendingUp,
    color: "text-brand-600",
    bg:    "bg-brand-50",
  },
  {
    label: "EBITDA",
    value: fmtR(consolidated.ebitda),
    sub:   `Margem ${pct(consolidatedMargins.ebitdaMargin)}`,
    delta: "+1.1pp vs 2025",
    up:    true,
    icon:  BarChart3,
    color: "text-violet-700",
    bg:    "bg-violet-50",
  },
  {
    label: "Lucro Líquido",
    value: fmtR(consolidated.netIncome),
    sub:   `Margem ${pct(consolidatedMargins.netMargin)}`,
    delta: "+0.8pp vs 2025",
    up:    true,
    icon:  Activity,
    color: "text-amber-700",
    bg:    "bg-amber-50",
  },
  {
    label: "Caixa Consolidado",
    value: fmtR(consolidated.cashBalance),
    sub:   "Todas as BUs",
    delta: `+${fmtR(consolidated.cashGenerated)} gerado`,
    up:    true,
    icon:  Wallet,
    color: "text-cyan-700",
    bg:    "bg-cyan-50",
  },
];

const execCards2 = [
  {
    label: "Free Cash Flow",
    value: fmtR(consolidated.cashGenerated - 92_000), // capex
    sub:   "FCF YTD",
    delta: "+21.4% vs 2025",
    up:    true,
    icon:  Zap,
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
  },
  {
    label: "Margem Bruta Média",
    value: pct(consolidatedMargins.grossMargin),
    sub:   "Ops. consolidado",
    delta: "+2.3pp vs 2025",
    up:    true,
    icon:  Target,
    color: "text-brand-600",
    bg:    "bg-brand-50",
  },
  {
    label: "Budget vs Actual",
    value: `+${budgetVsActual.toFixed(1)}%`,
    sub:   "Receita YTD vs budget",
    delta: "Acima do plano",
    up:    true,
    icon:  Scale,
    color: "text-violet-700",
    bg:    "bg-violet-50",
  },
  {
    label: "Forecast Accuracy",
    value: "94.2%",
    sub:   "Últimos 3 meses",
    delta: "+1.8pp vs média",
    up:    true,
    icon:  BarChart3,
    color: "text-amber-700",
    bg:    "bg-amber-50",
  },
  {
    label: "ROIC Consolidado",
    value: `${consolidatedRoic.toFixed(1)}%`,
    sub:   "Ops. BUs excl. Venture",
    delta: "+3.2pp vs 2025",
    up:    true,
    icon:  TrendingUp,
    color: "text-cyan-700",
    bg:    "bg-cyan-50",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqGroupPage() {
  const highRisks   = riskSignals.filter((r) => r.severity === "high").length;
  const mediumRisks = riskSignals.filter((r) => r.severity === "medium").length;

  return (
    <>
      <Header
        title="AWQ Group — Control Tower"
        subtitle="Holding · Visão consolidada · Jan–Mar 2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Executive Summary Row 1 ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {execCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-[11px] font-medium text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up
                      ? <ArrowUpRight size={10} className="text-emerald-600 shrink-0" />
                      : <ArrowDownRight size={10} className="text-red-600 shrink-0" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"} truncate`}>
                      {card.delta}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Executive Summary Row 2 ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {execCards2.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-[11px] font-medium text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up
                      ? <ArrowUpRight size={10} className="text-emerald-600 shrink-0" />
                      : <ArrowDownRight size={10} className="text-red-600 shrink-0" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"} truncate`}>
                      {card.delta}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BU Scoreboard ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">BU Scoreboard</h2>
            </div>
            <Link href="/business-units" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
              Detalhes <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">BU</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">M. Bruta</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">EBITDA</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro Líq.</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Cash Gen.</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Clientes</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Rec/Cliente</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Rec/FTE</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Capital</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ROIC</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Flag</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Drill</th>
                </tr>
              </thead>
              <tbody>
                {buData.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-sm text-gray-400">Sem dados disponíveis</td>
                  </tr>
                )}
                {buData.map((bu) => {
                  const flag       = allocFlags[bu.id];
                  const flagCfg    = flagConfig[flag];
                  const isVenture  = bu.id === "venture";
                  const grossMargin = bu.revenue > 0 ? (bu.grossProfit / bu.revenue) * 100 : 0;
                  const ebitdaMargin = bu.revenue > 0 ? (bu.ebitda / bu.revenue) * 100 : 0;
                  const revPerCust = bu.customers > 0 && bu.revenue > 0
                    ? Math.round(bu.revenue / bu.customers) : 0;
                  const revPerFte  = bu.ftes > 0 && bu.revenue > 0
                    ? Math.round(bu.revenue / bu.ftes) : 0;
                  return (
                    <tr key={bu.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors group">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                          <div>
                            <div className="text-xs font-bold text-gray-900">{bu.name}</div>
                            <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                        {isVenture ? <span className="text-gray-400">—</span> : fmtR(bu.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {isVenture
                          ? <span className="text-gray-400">—</span>
                          : <span className={`font-semibold ${grossMargin >= 55 ? "text-emerald-600" : "text-amber-700"}`}>
                              {grossMargin.toFixed(0)}%
                            </span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {isVenture
                          ? <span className="text-gray-400">—</span>
                          : <span className={`font-semibold ${ebitdaMargin >= 20 ? "text-emerald-600" : "text-amber-700"}`}>
                              {ebitdaMargin.toFixed(0)}%
                            </span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                        {fmtR(bu.netIncome)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">
                        {fmtR(bu.cashGenerated)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400">{bu.customers}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400">
                        {revPerCust > 0 ? fmtR(revPerCust) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400">
                        {revPerFte > 0 ? fmtR(revPerFte) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(bu.capitalAllocated)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold">
                        <span className={bu.roic >= 30 ? "text-emerald-600" : bu.roic >= 15 ? "text-amber-700" : "text-red-600"}>
                          {bu.roic.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                          {flagCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Link href={bu.hrefFinancial} className="text-[10px] text-brand-600 hover:text-brand-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          P&L <ChevronRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {/* Consolidated total */}
                <tr className="border-t border-gray-300 bg-gray-50">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">CONSOLIDADO (Ops)</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(consolidated.revenue)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{pct(consolidatedMargins.grossMargin)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{pct(consolidatedMargins.ebitdaMargin)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(consolidated.netIncome)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtR(consolidated.cashGenerated)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-400">{consolidated.customers}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-400">
                    {consolidated.customers > 0 ? fmtR(Math.round(consolidated.revenue / consolidated.customers)) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-400">
                    {consolidated.ftes > 0 ? fmtR(Math.round(consolidated.revenue / consolidated.ftes)) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(consolidated.capitalAllocated)}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{consolidatedRoic.toFixed(1)}%</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Risk Panel ───────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-600" />
                <h2 className="text-sm font-semibold text-gray-900">Risk Signals</h2>
                <span className="badge badge-red">{highRisks} alto</span>
                <span className="badge badge-yellow">{mediumRisks} médio</span>
              </div>
              <Link href="/awq/risk" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {riskSignals.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum sinal de risco registrado</p>
              )}
              {riskSignals.map((risk) => {
                const cfg = severityConfig[risk.severity];
                return (
                  <div key={risk.id} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{risk.title}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{risk.bu}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{risk.description}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[10px] font-bold ${cfg.color}`}>{risk.metric}</div>
                      <div className="text-[10px] text-gray-400">{risk.threshold}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Capital Allocation ───────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-amber-700" />
                <h2 className="text-sm font-semibold text-gray-900">Capital Allocation</h2>
              </div>
              <Link href="/awq/allocations" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
                Detalhes <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {buData.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
              )}
              {[...buData]
                .sort((a, b) => b.roic - a.roic)
                .map((bu) => {
                  const flag    = allocFlags[bu.id];
                  const flagCfg = flagConfig[flag];
                  const totalCap = buData.reduce((s, b) => s + b.capitalAllocated, 0);
                  const share    = totalCap > 0 ? (bu.capitalAllocated / totalCap) * 100 : 0;
                  return (
                    <div key={bu.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                          <span className="text-xs text-gray-400">{bu.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${flagCfg.color} ${flagCfg.bg} px-1.5 py-0.5 rounded`}>
                            {flagCfg.label}
                          </span>
                          <span className={`text-xs font-bold ${bu.roic >= 30 ? "text-emerald-600" : bu.roic >= 15 ? "text-amber-700" : "text-red-600"}`}>
                            ROIC {bu.roic.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${bu.color} rounded-full`} style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 w-12 text-right shrink-0">{fmtR(bu.capitalAllocated)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* BU Ranking */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ranking por Margem</div>
              {[...buData]
                .filter((b) => b.revenue > 0)
                .sort((a, b) => (b.grossProfit / b.revenue) - (a.grossProfit / a.revenue))
                .map((bu, i) => (
                  <div key={bu.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400">#{i + 1}</span>
                      <span className="text-[11px] text-gray-400">{bu.name}</span>
                    </div>
                    <span className={`text-[11px] font-bold ${bu.accentColor}`}>
                      {((bu.grossProfit / bu.revenue) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* ── Drill-Down Navigation ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">Drill-Down por BU</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {buData.map((bu) => (
              <div key={bu.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-6 h-6 rounded-lg ${bu.color} flex items-center justify-center shrink-0`}>
                    <Building2 size={11} className="text-gray-900" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{bu.name}</div>
                    <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { label: "Visão Geral",    href: bu.hrefOverview   },
                    { label: "Financial",       href: bu.hrefFinancial  },
                    { label: "Customers",       href: bu.hrefCustomers  },
                    { label: "Unit Economics",  href: bu.hrefUnitEcon   },
                    { label: "Budget",          href: bu.hrefBudget     },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <span className="text-[11px] text-gray-500 group-hover:text-gray-400 transition-colors">{link.label}</span>
                      <ChevronRight size={10} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Revenue Trend ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Receita Consolidada por BU — Jan–Mar 2026</h2>
            <Link href="/awq/financial" className="text-[11px] text-brand-600 hover:text-brand-500 flex items-center gap-1 transition-colors">
              Ver P&L completo <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {monthlyRevenue.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
            )}
            {monthlyRevenue.map((m) => {
              const maxTotal = Math.max(...monthlyRevenue.map((r) => r.total));
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12 shrink-0">{m.month}</span>
                  <div className="flex-1 flex h-5 rounded-full overflow-hidden gap-0.5">
                    {[
                      { value: m.jacqes,  bg: "bg-brand-500"   },
                      { value: m.caza,    bg: "bg-emerald-500" },
                      { value: m.advisor, bg: "bg-violet-500"  },
                    ].map((seg, i) => (
                      <div
                        key={i}
                        className={`${seg.bg} h-full`}
                        style={{ width: `${(seg.value / maxTotal) * 100 * (seg.value / m.total)}%` }}
                        title={fmtR(seg.value)}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-20 text-right shrink-0">{fmtR(m.total)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-brand-500 inline-block" /> JACQES</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Caza Vision</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500 inline-block" /> Advisor</span>
          </div>
        </div>

        {/* ── Quick Nav to AWQ Sub-pages ────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Financial",    sub: "P&L consolidado",         href: "/awq/financial",   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Cash Flow",    sub: "Fluxo de caixa",           href: "/awq/cashflow",    icon: Zap,        color: "text-cyan-700",    bg: "bg-cyan-50"    },
            { label: "Budget",       sub: "Budget vs Actual",         href: "/awq/budget",      icon: Scale,      color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Forecast",     sub: "Cenários 2026",            href: "/awq/forecast",    icon: TrendingUp, color: "text-violet-700",  bg: "bg-violet-50"  },
            { label: "Allocations",  sub: "Capital por BU",           href: "/awq/allocations", icon: Wallet,     color: "text-amber-700",   bg: "bg-amber-50"   },
            { label: "Risk",         sub: "Risk signals",             href: "/awq/risk",        icon: AlertTriangle, color: "text-red-600",  bg: "bg-red-50"     },
            { label: "BUs",          sub: "Todas as unidades",         href: "/business-units",  icon: Activity,   color: "text-gray-400",    bg: "bg-gray-500/10"    },
            { label: "AWQ Venture",  sub: "Portfólio de investimentos",href: "/awq-venture",     icon: BarChart3,  color: "text-amber-700",   bg: "bg-amber-50"   },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="card p-4 flex items-center gap-3 hover:border-gray-300 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={item.color} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">{item.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{item.sub}</div>
                </div>
                <ChevronRight size={12} className="text-gray-400 group-hover:text-brand-600 ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}

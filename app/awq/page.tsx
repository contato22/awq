import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ShieldAlert,
  Activity,
  Wallet,
  Target,
  Building2,
  Scale,
  CheckCircle,
  AlertTriangle,
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
  high:   { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200/60",  dot: "bg-red-500",    icon: AlertTriangle },
  medium: { color: "text-amber-800",  bg: "bg-amber-50",  border: "border-amber-200/60", dot: "bg-amber-500",  icon: AlertTriangle },
  low:    { color: "text-brand-700",  bg: "bg-brand-50",  border: "border-brand-200/60", dot: "bg-brand-500",  icon: CheckCircle   },
};

// ─── Executive Summary Cards ──────────────────────────────────────────────────

const primaryMetrics = [
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
    color: "text-violet-600",
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

const secondaryMetrics = [
  {
    label: "Free Cash Flow",
    value: fmtR(consolidated.cashGenerated - 92_000),
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
    color: "text-violet-600",
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

// ─── Metric Card Component ────────────────────────────────────────────────────

function ExecMetricCard({ card, elevated = false }: {
  card: typeof primaryMetrics[0];
  elevated?: boolean;
}) {
  const Icon = card.icon;
  return (
    <div className={`${elevated ? "card-elevated" : "card"} p-4 lg:p-5 flex items-start gap-3`}>
      <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={card.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-lg lg:text-xl font-bold text-gray-900 tabular-nums tracking-tight">
          {card.value}
        </div>
        <div className="text-[11px] font-medium text-gray-500 mt-0.5 leading-tight truncate">
          {card.label}
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          {card.up
            ? <ArrowUpRight size={11} className="text-emerald-600 shrink-0" />
            : <ArrowDownRight size={11} className="text-red-600 shrink-0" />}
          <span className={`text-[11px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"} truncate`}>
            {card.delta}
          </span>
        </div>
      </div>
    </div>
  );
}

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
      <div className="page-container">

        {/* ── Primary Executive Metrics ──────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {primaryMetrics.map((card) => (
              <ExecMetricCard key={card.label} card={card} elevated />
            ))}
          </div>
        </section>

        {/* ── Secondary Metrics ──────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {secondaryMetrics.map((card) => (
              <ExecMetricCard key={card.label} card={card} />
            ))}
          </div>
        </section>

        {/* ── BU Scoreboard ──────────────────────────────────────── */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            icon={<Building2 size={15} />}
            title="BU Scoreboard"
            linkLabel="Detalhes"
            linkHref="/business-units"
          />
          <div className="table-scroll -mx-1">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">BU</th>
                  <th className="table-header-right">Receita</th>
                  <th className="table-header-right">M. Bruta</th>
                  <th className="table-header-right">EBITDA</th>
                  <th className="table-header-right">Lucro Líq.</th>
                  <th className="table-header-right">Cash Gen.</th>
                  <th className="table-header-right">Clientes</th>
                  <th className="table-header-right">Rec/Cliente</th>
                  <th className="table-header-right">Rec/FTE</th>
                  <th className="table-header-right">Capital</th>
                  <th className="table-header-right">ROIC</th>
                  <th className="table-header">Flag</th>
                  <th className="table-header">Drill</th>
                </tr>
              </thead>
              <tbody>
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
                    <tr key={bu.id} className="table-row group">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${bu.color} shrink-0`} />
                          <div>
                            <div className="text-xs font-bold text-gray-900">{bu.name}</div>
                            <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-semibold text-gray-900">
                        {isVenture ? <span className="text-gray-300">—</span> : fmtR(bu.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right text-xs">
                        {isVenture
                          ? <span className="text-gray-300">—</span>
                          : <span className={`font-semibold ${grossMargin >= 55 ? "text-emerald-600" : "text-amber-700"}`}>
                              {grossMargin.toFixed(0)}%
                            </span>}
                      </td>
                      <td className="py-3 px-3 text-right text-xs">
                        {isVenture
                          ? <span className="text-gray-300">—</span>
                          : <span className={`font-semibold ${ebitdaMargin >= 20 ? "text-emerald-600" : "text-amber-700"}`}>
                              {ebitdaMargin.toFixed(0)}%
                            </span>}
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-semibold text-gray-900">
                        {fmtR(bu.netIncome)}
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-semibold text-emerald-600">
                        {fmtR(bu.cashGenerated)}
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-gray-500">{bu.customers}</td>
                      <td className="py-3 px-3 text-right text-xs text-gray-500">
                        {revPerCust > 0 ? fmtR(revPerCust) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-gray-500">
                        {revPerFte > 0 ? fmtR(revPerFte) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(bu.capitalAllocated)}</td>
                      <td className="py-3 px-3 text-right text-xs font-bold">
                        <span className={bu.roic >= 30 ? "text-emerald-600" : bu.roic >= 15 ? "text-amber-700" : "text-red-600"}>
                          {bu.roic.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                          {flagCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Link href={bu.hrefFinancial} className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          P&L <ChevronRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {/* Consolidated total */}
                <tr className="table-row-total">
                  <td className="py-3 px-3 text-xs font-bold text-gray-500">CONSOLIDADO (Ops)</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-gray-900">{fmtR(consolidated.revenue)}</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-emerald-600">{pct(consolidatedMargins.grossMargin)}</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-emerald-600">{pct(consolidatedMargins.ebitdaMargin)}</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-gray-900">{fmtR(consolidated.netIncome)}</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-emerald-600">{fmtR(consolidated.cashGenerated)}</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-gray-500">{consolidated.customers}</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-gray-500">
                    {fmtR(Math.round(consolidated.revenue / consolidated.customers))}
                  </td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-gray-500">
                    {fmtR(Math.round(consolidated.revenue / consolidated.ftes))}
                  </td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-gray-900">{fmtR(consolidated.capitalAllocated)}</td>
                  <td className="py-3 px-3 text-right text-xs font-bold text-emerald-600">{consolidatedRoic.toFixed(1)}%</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Risk + Capital Allocation Row ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Risk Panel */}
          <section className="xl:col-span-2 card p-5 lg:p-6">
            <SectionHeader
              icon={<ShieldAlert size={15} className="text-red-500" />}
              title="Risk Signals"
              badge={
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="badge-red">{highRisks} alto</span>
                  <span className="badge-yellow">{mediumRisks} médio</span>
                </div>
              }
              linkLabel="Ver todos"
              linkHref="/awq/risk"
            />
            <div className="space-y-2">
              {riskSignals.length === 0 ? (
                <div className="flex items-center gap-3 py-8 justify-center text-sm text-gray-400">
                  <CheckCircle size={16} className="text-emerald-500" />
                  Nenhum sinal de risco ativo
                </div>
              ) : (
                riskSignals.map((risk) => {
                  const cfg = severityConfig[risk.severity];
                  return (
                    <div key={risk.id} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${cfg.color}`}>{risk.title}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{risk.bu}</span>
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{risk.description}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-[10px] font-bold ${cfg.color}`}>{risk.metric}</div>
                        <div className="text-[10px] text-gray-400">{risk.threshold}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Capital Allocation */}
          <section className="card p-5 lg:p-6">
            <SectionHeader
              icon={<Wallet size={15} className="text-amber-600" />}
              title="Capital Allocation"
              linkLabel="Detalhes"
              linkHref="/awq/allocations"
            />
            <div className="space-y-3.5">
              {[...buData]
                .sort((a, b) => b.roic - a.roic)
                .map((bu) => {
                  const flag    = allocFlags[bu.id];
                  const flagCfg = flagConfig[flag];
                  const totalCap = buData.reduce((s, b) => s + b.capitalAllocated, 0);
                  const share    = (bu.capitalAllocated / totalCap) * 100;
                  return (
                    <div key={bu.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                          <span className="text-xs text-gray-600 font-medium">{bu.name}</span>
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
                          <div className={`h-full ${bu.color} rounded-full transition-all duration-500`} style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-500 w-14 text-right shrink-0 font-medium tabular-nums">{fmtR(bu.capitalAllocated)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* BU Ranking */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-2.5">
                Ranking por Margem
              </div>
              {[...buData]
                .filter((b) => b.revenue > 0)
                .sort((a, b) => (b.grossProfit / b.revenue) - (a.grossProfit / a.revenue))
                .map((bu, i) => (
                  <div key={bu.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-300 w-4">#{i + 1}</span>
                      <span className="text-[11px] text-gray-600 font-medium">{bu.name}</span>
                    </div>
                    <span className={`text-[11px] font-bold ${bu.accentColor}`}>
                      {((bu.grossProfit / bu.revenue) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* ── Drill-Down Navigation ──────────────────────────────── */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            icon={<Target size={15} className="text-brand-500" />}
            title="Drill-Down por BU"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {buData.map((bu) => (
              <div key={bu.id} className="rounded-xl border border-gray-200/80 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-7 h-7 rounded-lg ${bu.color} flex items-center justify-center shrink-0`}>
                    <Building2 size={12} className="text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{bu.name}</div>
                    <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                  </div>
                </div>
                <div className="space-y-0.5">
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
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <span className="text-[11px] text-gray-500 group-hover:text-gray-700 transition-colors font-medium">{link.label}</span>
                      <ChevronRight size={10} className="text-gray-300 group-hover:text-brand-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Revenue Trend ──────────────────────────────────────── */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            title="Receita Consolidada por BU — Jan–Mar 2026"
            linkLabel="Ver P&L completo"
            linkHref="/awq/financial"
          />
          <div className="space-y-2.5">
            {monthlyRevenue.map((m) => {
              const maxTotal = Math.max(...monthlyRevenue.map((r) => r.total));
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12 shrink-0 font-medium">{m.month}</span>
                  <div className="flex-1 flex h-6 rounded-lg overflow-hidden gap-px bg-gray-100">
                    {[
                      { value: m.jacqes,  bg: "bg-brand-500"   },
                      { value: m.caza,    bg: "bg-emerald-500" },
                      { value: m.advisor, bg: "bg-violet-500"  },
                    ].map((seg, i) => (
                      <div
                        key={i}
                        className={`${seg.bg} h-full transition-all duration-500`}
                        style={{ width: `${(seg.value / maxTotal) * 100 * (seg.value / m.total)}%` }}
                        title={fmtR(seg.value)}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-20 text-right shrink-0 tabular-nums">{fmtR(m.total)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-5 mt-4 pt-3 border-t border-gray-100">
            {[
              { label: "JACQES",     color: "bg-brand-500" },
              { label: "Caza Vision", color: "bg-emerald-500" },
              { label: "Advisor",    color: "bg-violet-500" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                <span className={`w-2.5 h-2.5 rounded-sm ${item.color} inline-block`} />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Quick Nav to AWQ Sub-pages ──────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: "Financial",    sub: "P&L consolidado",         href: "/awq/financial",   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Cash Flow",    sub: "Fluxo de caixa",           href: "/awq/cashflow",    icon: Zap,        color: "text-cyan-700",    bg: "bg-cyan-50"    },
              { label: "Budget",       sub: "Budget vs Actual",         href: "/awq/budget",      icon: Scale,      color: "text-brand-600",   bg: "bg-brand-50"   },
              { label: "Forecast",     sub: "Cenários 2026",            href: "/awq/forecast",    icon: TrendingUp, color: "text-violet-600",  bg: "bg-violet-50"  },
              { label: "Allocations",  sub: "Capital por BU",           href: "/awq/allocations", icon: Wallet,     color: "text-amber-700",   bg: "bg-amber-50"   },
              { label: "Risk",         sub: "Risk signals",             href: "/awq/risk",        icon: AlertTriangle, color: "text-red-500",  bg: "bg-red-50"     },
              { label: "BUs",          sub: "Todas as unidades",         href: "/business-units",  icon: Activity,   color: "text-gray-500",    bg: "bg-gray-100"   },
              { label: "AWQ Venture",  sub: "Portfólio de investimentos",href: "/awq-venture",     icon: BarChart3,  color: "text-amber-700",   bg: "bg-amber-50"   },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="card-interactive p-4 flex items-center gap-3 group"
                >
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={15} className={item.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{item.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">{item.sub}</div>
                  </div>
                  <ChevronRight size={13} className="text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </>
  );
}

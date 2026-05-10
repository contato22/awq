// M&A Command Center — server component
// SSR: queries Neon. Static export: falls back to SEED arrays.
import Header from "@/components/Header";
import Link from "next/link";
import {
  TrendingUp, Building2, DollarSign, BarChart3, Network,
  Layers, ChevronRight, GitMerge, Briefcase, FileText,
  CalendarDays, Zap, ArrowUpRight, Users, Film, Activity,
  PieChart, Target,
} from "lucide-react";
import {
  listPortfolioCompanies,
  listDeals,
  getPortfolioDashboardTotals,
  initMaDB,
} from "@/lib/ma-db";

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const STAGE_LABELS: Record<string, string> = {
  sourcing:      "Sourcing",
  screening:     "Triagem",
  due_diligence: "Due Diligence",
  structuring:   "Estruturação",
  ic_review:     "Revisão IC",
  closed_won:    "Fechados (Won)",
  closed_lost:   "Fechados (Lost)",
};

const STAGE_COLORS: Record<string, string> = {
  sourcing:      "bg-gray-500/20 text-gray-300",
  screening:     "bg-blue-500/20 text-blue-300",
  due_diligence: "bg-amber-500/20 text-amber-300",
  structuring:   "bg-orange-500/20 text-orange-300",
  ic_review:     "bg-purple-500/20 text-purple-300",
};

const STAGE_BAR: Record<string, string> = {
  sourcing:      "bg-gray-500",
  screening:     "bg-blue-500",
  due_diligence: "bg-amber-500",
  structuring:   "bg-orange-500",
  ic_review:     "bg-purple-500",
};

const quickLinks = [
  { label: "Deal Pipeline",   href: "/awq/ma/deals",            icon: Activity,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
  { label: "Portfolio",       href: "/awq/portfolio",            icon: Briefcase,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { label: "Cap Table",       href: "/awq/ma/cap-table",         icon: PieChart,    color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
  { label: "Comitê IC",       href: "/awq/ma/ic",                icon: CalendarDays,color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20"  },
  { label: "Sinergias",       href: "/awq/ma/synergies",         icon: Network,     color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20"    },
  { label: "Consolidação",    href: "/awq/ma/consolidation",     icon: Layers,      color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20"    },
  { label: "Novo Deal",       href: "/awq/ma/deals/new",         icon: FileText,    color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20"  },
  { label: "KPIs Portco",     href: "/awq/portfolio/kpis",       icon: BarChart3,   color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20"  },
  { label: "Mídia M4E",       href: "/awq/portfolio/media",      icon: Film,        color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20"    },
  { label: "Board Meetings",  href: "/awq/portfolio/board",      icon: Users,       color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/20"    },
];

const pipelineStages = ["sourcing", "screening", "due_diligence", "structuring", "ic_review"];

export default async function MaCommandCenterPage() {
  await initMaDB();

  const [deals, portcos, totals] = await Promise.all([
    listDeals(),
    listPortfolioCompanies(),
    getPortfolioDashboardTotals(),
  ]);

  const activeDeals = deals.filter(
    d => d.pipeline_stage !== "closed_won" && d.pipeline_stage !== "closed_lost"
  );

  const stageCount: Record<string, number> = {};
  for (const d of deals) {
    const s = d.pipeline_stage ?? "sourcing";
    stageCount[s] = (stageCount[s] ?? 0) + 1;
  }
  const maxCount = Math.max(...pipelineStages.map(s => stageCount[s] ?? 0), 1);

  const activePortcos = portcos.filter(p => p.status === "active");

  const totalInvested  = totals.total_investment ?? 0;
  const currentValue   = totals.total_current_value ?? totalInvested;
  const unrealizedGain = currentValue - totalInvested;

  const kpiCards = [
    {
      label: "Portfólio Ativo",
      value: String(totals.active_portcos ?? activePortcos.length),
      sub:   "empresas investidas",
      icon:  Building2,
      color: "text-emerald-400",
      bg:    "bg-emerald-500/10",
      border:"border-emerald-500/20",
    },
    {
      label: "Total Investido",
      value: totalInvested ? fmtR(totalInvested) : "—",
      sub:   "capital comprometido",
      icon:  DollarSign,
      color: "text-blue-400",
      bg:    "bg-blue-500/10",
      border:"border-blue-500/20",
    },
    {
      label: "Valor Atual",
      value: currentValue ? fmtR(currentValue) : "—",
      sub:   unrealizedGain >= 0 ? `+${fmtR(unrealizedGain)} não-realizado` : `${fmtR(unrealizedGain)} não-realizado`,
      icon:  TrendingUp,
      color: unrealizedGain >= 0 ? "text-emerald-400" : "text-red-400",
      bg:    unrealizedGain >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      border:unrealizedGain >= 0 ? "border-emerald-500/20" : "border-red-500/20",
    },
    {
      label: "Múltiplo Médio",
      value: totals.weighted_avg_multiple ? totals.weighted_avg_multiple.toFixed(2) + "×" : "—",
      sub:   "weighted avg. MOIC",
      icon:  Target,
      color: "text-amber-400",
      bg:    "bg-amber-500/10",
      border:"border-amber-500/20",
    },
    {
      label: "Deals no Pipeline",
      value: String(activeDeals.length),
      sub:   `${stageCount["closed_won"] ?? 0} fechados (won)`,
      icon:  BarChart3,
      color: "text-purple-400",
      bg:    "bg-purple-500/10",
      border:"border-purple-500/20",
    },
    {
      label: "Mídia Entregue",
      value: totals.media_delivery_pct != null ? totals.media_delivery_pct.toFixed(0) + "%" : "—",
      sub:   "do compromisso M4E",
      icon:  Film,
      color: "text-cyan-400",
      bg:    "bg-cyan-500/10",
      border:"border-cyan-500/20",
    },
  ];

  return (
    <>
      <Header title="M&A Command Center" subtitle="Holding-Level · AWQ Group" />
      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* Hero */}
        <div className="rounded-xl bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900 border border-gray-700/80 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <GitMerge size={22} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">M&A Command Center</h2>
                <p className="text-sm text-gray-400 mt-0.5">Gestão holding-level · AWQ Group</p>
              </div>
            </div>
            <Link
              href="/awq/ma/deals/new"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-bold rounded-lg transition-colors"
            >
              <FileText size={13} />
              Novo Deal
            </Link>
          </div>
          <p className="relative text-xs text-gray-500 mt-4 max-w-2xl">
            Visão consolidada do pipeline de deals M4E, portfólio de empresas investidas, estrutura de capital, comitê de investimentos e sinergias do grupo.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-xl bg-gray-800/50 border ${card.border} p-4 flex flex-col gap-3`}>
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={15} className={card.color} />
                </div>
                <div>
                  <div className="text-xl font-bold text-white leading-none">{card.value}</div>
                  <div className="text-[10px] text-gray-500 mt-1 leading-tight">{card.label}</div>
                  {card.sub && <div className="text-[9px] text-gray-600 mt-0.5 leading-tight">{card.sub}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Two columns: Quick Links + Pipeline Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Quick Links */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Módulos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {quickLinks.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`rounded-xl bg-gray-800/50 border ${item.border} p-3 flex flex-col items-center gap-2 text-center hover:bg-gray-800 transition-all group`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <Icon size={14} className={item.color} />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 group-hover:text-white transition-colors leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Pipeline Funnel */}
          <div className="lg:col-span-2 rounded-xl bg-gray-800/50 border border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Funil de Pipeline</h3>
              <Link href="/awq/ma/deals" className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                Ver todos <ChevronRight size={11} />
              </Link>
            </div>
            <div className="space-y-3">
              {pipelineStages.map(stage => {
                const count = stageCount[stage] ?? 0;
                const pct   = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                        {STAGE_LABELS[stage]}
                      </span>
                      <span className="text-xs font-bold text-white">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${STAGE_BAR[stage]} rounded-full transition-all`}
                        style={{ width: `${pct}%`, minWidth: count > 0 ? "4%" : "0%" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {((stageCount["closed_won"] ?? 0) + (stageCount["closed_lost"] ?? 0)) > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700/60 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-xs text-gray-500"><span className="text-emerald-400 font-bold">{stageCount["closed_won"] ?? 0}</span> won</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  <span className="text-xs text-gray-500"><span className="text-red-400 font-bold">{stageCount["closed_lost"] ?? 0}</span> lost</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Companies Strip */}
        {activePortcos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={13} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portfolio Ativo</h3>
              <Link href="/awq/portfolio" className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                Ver todos <ChevronRight size={11} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activePortcos.map(p => {
                const mrr = (p as any).latest_mrr ?? (p as any).mrr ?? null;
                const runway = (p as any).runway_months ?? null;
                const awqPct = p.awq_ownership_pct ?? null;
                return (
                  <Link
                    key={p.portco_id}
                    href={`/awq/portfolio/${p.portco_id}`}
                    className="rounded-xl bg-gray-800/50 border border-gray-700 hover:border-gray-500 p-4 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                          {p.legal_name ?? (p as any).company_name}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{p.portco_code}</div>
                      </div>
                      <ArrowUpRight size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[9px] text-gray-600">AWQ %</div>
                        <div className="text-xs font-bold text-amber-400">{awqPct != null ? awqPct.toFixed(0) + "%" : "—"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-600">MRR</div>
                        <div className="text-xs font-bold text-emerald-400">{mrr ? fmtR(mrr) : "—"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-600">Runway</div>
                        <div className={`text-xs font-bold ${runway != null && runway < 6 ? "text-red-400" : runway != null && runway < 12 ? "text-amber-400" : "text-gray-300"}`}>
                          {runway != null ? runway + "m" : "—"}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// M&A Command Center Hub
// Server Component — imports from ma-db directly:
//   • SSR (Vercel): queries Neon PostgreSQL
//   • Static export (GitHub Pages): falls back to SEED arrays automatically
import Header from "@/components/Header";
import Link from "next/link";
import {
  TrendingUp,
  Building2,
  DollarSign,
  BarChart3,
  Network,
  Layers,
  ChevronRight,
  GitMerge,
  Briefcase,
  FileText,
  CalendarDays,
  Zap,
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

const quickLinks = [
  { label: "Pipeline de Deals",  href: "/awq/ma/deals",        icon: Briefcase,    color: "text-blue-400",    bg: "bg-blue-500/10"    },
  { label: "Portfólio M&A",      href: "/awq/portfolio",        icon: Building2,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Cap Table",          href: "/awq/ma/cap-table",     icon: FileText,     color: "text-amber-400",   bg: "bg-amber-500/10"   },
  { label: "Comitê IC",          href: "/awq/ma/ic",            icon: CalendarDays, color: "text-purple-400",  bg: "bg-purple-500/10"  },
  { label: "Sinergias",          href: "/awq/ma/synergies",     icon: Network,      color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
  { label: "Consolidação",       href: "/awq/ma/consolidation", icon: Layers,       color: "text-rose-400",    bg: "bg-rose-500/10"    },
];

const pipelineStages = ["sourcing", "screening", "due_diligence", "structuring", "ic_review"];

export default async function MaCommandCenterPage() {
  await initMaDB();

  const [deals, totals] = await Promise.all([
    listDeals(),
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

  const kpiCards = [
    { label: "Portfólio Ativo",   value: String(totals.active_portcos),                                              icon: Building2,  color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Investido",   value: totals.total_investment ? fmtR(totals.total_investment) : "R$0",             icon: DollarSign, color: "text-blue-400",    bg: "bg-blue-500/10"    },
    { label: "Múltiplo Médio",    value: totals.weighted_avg_multiple ? totals.weighted_avg_multiple.toFixed(2) + "×" : "—", icon: TrendingUp, color: "text-amber-400",   bg: "bg-amber-500/10"   },
    { label: "Deals no Pipeline", value: String(activeDeals.length),                                                 icon: BarChart3,  color: "text-purple-400",  bg: "bg-purple-500/10"  },
  ];

  return (
    <>
      <Header title="M&A Command Center" subtitle="Holding-Level · AWQ Group" />
      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* Hero */}
        <div className="rounded-xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <GitMerge size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">M&A Command Center</h2>
              <p className="text-sm text-gray-400">Gestão de fusões, aquisições e portfólio — AWQ Group Holding</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-2xl">
            Visão consolidada do pipeline de deals, portfólio de empresas investidas, estrutura de capital, comitê de investimentos e sinergias do grupo.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-lg bg-gray-800/50 border border-gray-700 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Módulos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickLinks.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 flex flex-col items-center gap-2 text-center hover:border-gray-500 hover:bg-gray-800 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <Icon size={16} className={item.color} />
                  </div>
                  <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Funil de Pipeline</h3>
            <Link href="/awq/ma/deals" className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {pipelineStages.map(stage => {
              const count = stageCount[stage] ?? 0;
              const pct   = (count / maxCount) * 100;
              const barColor = stage === "sourcing" ? "bg-gray-500" : stage === "screening" ? "bg-blue-500"
                : stage === "due_diligence" ? "bg-amber-500" : stage === "structuring" ? "bg-orange-500" : "bg-purple-500";
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  <div className="flex-1 h-5 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%`, minWidth: count > 0 ? "2%" : "0%" }} />
                  </div>
                  <span className="w-8 text-right text-xs font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
          {((stageCount["closed_won"] ?? 0) + (stageCount["closed_lost"] ?? 0)) > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700 flex gap-4">
              <span className="text-xs text-gray-500"><span className="text-emerald-400 font-bold">{stageCount["closed_won"] ?? 0}</span> won</span>
              <span className="text-xs text-gray-500"><span className="text-red-400 font-bold">{stageCount["closed_lost"] ?? 0}</span> lost</span>
            </div>
          )}
        </div>

      </div>
    </>
  );
}

// M&A Command Center — server component
// SSR: queries Neon. Static export: falls back to SEED arrays.
import Header from "@/components/Header";
import Link from "next/link";
import {
  TrendingUp, Building2, DollarSign, BarChart3, Network,
  Layers, ChevronRight, GitMerge, Briefcase, FileText,
  CalendarDays, Film, Activity, PieChart, Target,
  ArrowUpRight, Plus, Users,
} from "lucide-react";
import {

  listPortfolioCompanies,
  listDeals,
  getPortfolioDashboardTotals,
  initMaDB,
} from "@/lib/ma-db";

export const dynamic = "force-dynamic";

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(1) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const STAGE_LABELS: Record<string, string> = {
  sourcing:      "Sourcing",
  screening:     "Triagem",
  due_diligence: "Due Diligence",
  structuring:   "Estruturação",
  ic_review:     "Revisão IC",
};

const STAGE_BAR: Record<string, string> = {
  sourcing:      "bg-gray-400",
  screening:     "bg-blue-500",
  due_diligence: "bg-amber-500",
  structuring:   "bg-orange-500",
  ic_review:     "bg-purple-500",
};

const STAGE_DOT: Record<string, string> = {
  sourcing:      "bg-gray-400",
  screening:     "bg-blue-400",
  due_diligence: "bg-amber-400",
  structuring:   "bg-orange-400",
  ic_review:     "bg-purple-400",
};

const pipelineStages = ["sourcing", "screening", "due_diligence", "structuring", "ic_review"];

// Primary modules (big cards)
const primaryLinks = [
  { label: "Deal Pipeline",  href: "/awq/ma/deals",         icon: Activity,    color: "text-blue-400",    bg: "bg-blue-50",    border: "border-blue-200",    accent: "bg-blue-500"    },
  { label: "Portfolio",      href: "/awq/portfolio",         icon: Briefcase,   color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", accent: "bg-emerald-500" },
  { label: "Cap Table",      href: "/awq/ma/cap-table",      icon: PieChart,    color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   accent: "bg-amber-500"   },
  { label: "Comitê IC",      href: "/awq/ma/ic",             icon: CalendarDays,color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200",  accent: "bg-violet-500"  },
  { label: "Sinergias",      href: "/awq/ma/synergies",      icon: Network,     color: "text-cyan-600",    bg: "bg-cyan-50",    border: "border-cyan-200",    accent: "bg-cyan-500"    },
  { label: "Consolidação",   href: "/awq/ma/consolidation",  icon: Layers,      color: "text-rose-600",    bg: "bg-rose-50",    border: "border-rose-200",    accent: "bg-rose-500"    },
];

// Secondary utility links
const secondaryLinks = [
  { label: "Novo Deal",      href: "/awq/ma/deals/new",      icon: FileText     },
  { label: "KPIs Portco",    href: "/awq/portfolio/kpis",    icon: BarChart3    },
  { label: "Mídia M4E",      href: "/awq/portfolio/media",   icon: Film         },
  { label: "Board Meetings", href: "/awq/portfolio/board",   icon: Users        },
];

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
  const totalDeals = pipelineStages.reduce((a, s) => a + (stageCount[s] ?? 0), 0);

  const activePortcos = portcos.filter(p => p.status === "active");
  const totalInvested  = totals.total_investment ?? 0;
  const currentValue   = totals.total_current_value ?? totalInvested;
  const unrealizedGain = currentValue - totalInvested;
  const moic = totals.weighted_avg_multiple ?? null;

  const kpiCards = [
    {
      label:  "Portfólio Ativo",
      value:  String(totals.active_portcos ?? activePortcos.length),
      sub:    "empresas investidas",
      icon:   Building2,
      accent: "border-l-emerald-500",
      val:    "text-emerald-600",
    },
    {
      label:  "Total Investido",
      value:  totalInvested ? fmtR(totalInvested) : "—",
      sub:    "capital comprometido",
      icon:   DollarSign,
      accent: "border-l-blue-500",
      val:    "text-blue-600",
    },
    {
      label:  "Valor Atual",
      value:  currentValue ? fmtR(currentValue) : "—",
      sub:    unrealizedGain >= 0 ? `+${fmtR(unrealizedGain)} ganho` : `${fmtR(unrealizedGain)} perda`,
      icon:   TrendingUp,
      accent: unrealizedGain >= 0 ? "border-l-emerald-500" : "border-l-red-500",
      val:    unrealizedGain >= 0 ? "text-emerald-600" : "text-red-600",
    },
    {
      label:  "MOIC Médio",
      value:  moic ? moic.toFixed(2) + "×" : "—",
      sub:    "múltiplo ponderado",
      icon:   Target,
      accent: "border-l-amber-500",
      val:    "text-amber-600",
    },
    {
      label:  "Pipeline Ativo",
      value:  String(activeDeals.length),
      sub:    `${stageCount["closed_won"] ?? 0} deal(s) fechado(s)`,
      icon:   BarChart3,
      accent: "border-l-violet-500",
      val:    "text-violet-600",
    },
    {
      label:  "Mídia Entregue",
      value:  totals.media_delivery_pct != null ? totals.media_delivery_pct.toFixed(0) + "%" : "—",
      sub:    "do compromisso M4E",
      icon:   Film,
      accent: "border-l-cyan-500",
      val:    "text-cyan-600",
    },
  ];

  return (
    <>
      <Header title="M&A Command Center" subtitle="Holding-Level · AWQ Group" />
      <div className="px-6 lg:px-8 py-6 space-y-5">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0">
              <GitMerge size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">M&A Command Center</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {activePortcos.length} portco{activePortcos.length !== 1 ? "s" : ""} ·{" "}
                {activeDeals.length} deal{activeDeals.length !== 1 ? "s" : ""} no pipeline ·{" "}
                {stageCount["closed_won"] ?? 0} fechado(s) won
              </p>
            </div>
          </div>
          <Link
            href="/awq/ma/deals/new"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-gray-900 text-xs font-bold rounded-lg transition-colors"
          >
            <Plus size={13} />
            Novo Deal
          </Link>
        </div>

        {/* ── KPI Strip ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${card.accent} p-4`}>
                <div className={`text-xl font-bold ${card.val}`}>{card.value}</div>
                <div className="text-xs font-semibold text-gray-600 mt-0.5">{card.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{card.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ── Main grid: Modules + Pipeline ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Left: Primary module cards */}
          <div className="lg:col-span-3 space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Módulos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {primaryLinks.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${item.bg} rounded-xl border ${item.border} p-4 flex items-center gap-3 hover:shadow-sm transition-all group`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-white border ${item.border} flex items-center justify-center shrink-0`}>
                      <Icon size={16} className={item.color} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-bold ${item.color} leading-tight`}>{item.label}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {/* Secondary links row */}
            <div className="flex gap-2 flex-wrap">
              {secondaryLinks.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                  >
                    <Icon size={12} className="text-gray-500" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Pipeline funnel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <BarChart3 size={12} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Pipeline Funnel</h3>
              <Link href="/awq/ma/deals" className="ml-auto text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5 font-medium">
                Ver todos <ChevronRight size={11} />
              </Link>
            </div>

            {totalDeals === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Plus size={18} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Pipeline vazio</p>
                <p className="text-xs text-gray-400 mb-3">Adicione o primeiro deal M4E para começar.</p>
                <Link
                  href="/awq/ma/deals/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Plus size={11} /> Adicionar deal
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pipelineStages.map(stage => {
                  const count = stageCount[stage] ?? 0;
                  const pct   = (count / maxCount) * 100;
                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[stage]}`} />
                          <span className="text-gray-600 font-medium">{STAGE_LABELS[stage]}</span>
                        </div>
                        <span className="font-bold text-gray-800">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${STAGE_BAR[stage]} rounded-full transition-all`}
                          style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-4 text-xs">
                  <span className="text-gray-400">Won: <span className="text-emerald-600 font-bold">{stageCount["closed_won"] ?? 0}</span></span>
                  <span className="text-gray-400">Lost: <span className="text-red-500 font-bold">{stageCount["closed_lost"] ?? 0}</span></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Portfolio strip ───────────────────────────────────────────────── */}
        {activePortcos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Portfolio Ativo</p>
              <Link href="/awq/portfolio" className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-0.5">
                Ver todos <ChevronRight size={11} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activePortcos.map(p => {
                const mrr = (p as any).latest_mrr ?? (p as any).mrr ?? null;
                const runway = (p as any).runway_months ?? null;
                const awqPct = p.awq_ownership_pct ?? null;
                const multiple = (p as any).current_valuation && (p as any).entry_valuation
                  ? ((p as any).current_valuation / (p as any).entry_valuation)
                  : null;
                return (
                  <Link
                    key={p.portco_id}
                    href={`/awq/portfolio/${p.portco_id}`}
                    className="bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm p-4 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors leading-tight">
                          {p.legal_name ?? (p as any).company_name}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{p.portco_code}</div>
                      </div>
                      <ArrowUpRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase font-medium">AWQ %</div>
                        <div className="text-xs font-bold text-amber-600">{awqPct != null ? awqPct.toFixed(0) + "%" : "—"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase font-medium">MRR</div>
                        <div className="text-xs font-bold text-emerald-600">{mrr ? fmtR(mrr) : "—"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase font-medium">Runway</div>
                        <div className={`text-xs font-bold ${runway != null && runway < 6 ? "text-red-500" : runway != null && runway < 12 ? "text-amber-600" : "text-gray-700"}`}>
                          {runway != null ? runway + "m" : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase font-medium">MOIC</div>
                        <div className={`text-xs font-bold ${multiple != null && multiple >= 1 ? "text-emerald-600" : "text-gray-700"}`}>
                          {multiple != null ? multiple.toFixed(2) + "×" : "—"}
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

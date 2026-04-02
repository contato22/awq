import Header from "@/components/Header";
import {
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const deals = [
  {
    id: "P001",
    company:     "MedIA Health",
    sector:      "HealthTech",
    stage:       "Due Diligence",
    ticket:      4_000_000,
    eta:         "Q2 2026",
    score:       8.4,
    source:      "Network",
    description: "IA para diagnóstico por imagem em hospitais privados. Receita recorrente B2B.",
    priority:    "Alta",
  },
  {
    id: "P002",
    company:     "EduFlow",
    sector:      "EdTech",
    stage:       "Term Sheet",
    ticket:      3_000_000,
    eta:         "Q2 2026",
    score:       7.9,
    source:      "Indicação",
    description: "LMS corporativo para treinamento de equipes remotas. 200+ clientes ativos.",
    priority:    "Alta",
  },
  {
    id: "P003",
    company:     "CarbonX",
    sector:      "CleanTech",
    stage:       "Prospecção",
    ticket:      8_000_000,
    eta:         "Q3 2026",
    score:       7.2,
    source:      "Evento",
    description: "Créditos de carbono tokenizados para mercado voluntário. Pré-receita.",
    priority:    "Média",
  },
  {
    id: "P004",
    company:     "RetailAI",
    sector:      "RetailTech",
    stage:       "Prospecção",
    ticket:      2_500_000,
    eta:         "Q3 2026",
    score:       6.8,
    source:      "Cold Inbound",
    description: "Precificação dinâmica e gestão de estoque por IA para varejo físico.",
    priority:    "Média",
  },
  {
    id: "P005",
    company:     "CyberShield",
    sector:      "Cybersecurity",
    stage:       "Triagem",
    ticket:      5_000_000,
    eta:         "Q4 2026",
    score:       7.5,
    source:      "Network",
    description: "Proteção de endpoints para PMEs com modelo managed service.",
    priority:    "Alta",
  },
  {
    id: "P006",
    company:     "FarmAI",
    sector:      "AgTech",
    stage:       "Triagem",
    ticket:      1_800_000,
    eta:         "Q4 2026",
    score:       6.1,
    source:      "Cold Inbound",
    description: "Previsão de colheita e risco climático via sensoriamento remoto.",
    priority:    "Baixa",
  },
];

const stages = ["Triagem", "Prospecção", "Due Diligence", "Term Sheet"] as const;

const stageConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "Triagem":        { icon: Search,      color: "text-gray-400",    bg: "bg-gray-100"    },
  "Prospecção":     { icon: TrendingUp,  color: "text-amber-700",   bg: "bg-amber-50"   },
  "Due Diligence":  { icon: FileText,    color: "text-brand-600",   bg: "bg-brand-50"   },
  "Term Sheet":     { icon: CheckCircle2,color: "text-emerald-600", bg: "bg-emerald-50" },
};

const priorityBadge: Record<string, string> = {
  "Alta":  "badge badge-red",
  "Média": "badge badge-yellow",
  "Baixa": "badge",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqVenturePipelinePage() {
  const totalTicket     = deals.reduce((s, d) => s + d.ticket, 0);
  const termSheetDeals  = deals.filter((d) => d.stage === "Term Sheet").length;
  const ddDeals         = deals.filter((d) => d.stage === "Due Diligence").length;

  return (
    <>
      <Header
        title="Pipeline — AWQ Venture"
        subtitle={`${deals.length} deals em avaliação · ${fmtR(totalTicket)} em ticket potencial`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Deals Ativos",       value: deals.length,    icon: TrendingUp,  color: "text-amber-700",  bg: "bg-amber-50"  },
            { label: "Ticket Potencial",   value: fmtR(totalTicket), icon: DollarSign, color: "text-emerald-600",bg: "bg-emerald-50" },
            { label: "Due Diligence",      value: ddDeals,         icon: FileText,    color: "text-brand-600",  bg: "bg-brand-50"  },
            { label: "Term Sheet Enviados",value: termSheetDeals,  icon: CheckCircle2,color: "text-violet-700", bg: "bg-violet-50" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={s.color} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Kanban ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stages.map((stage) => {
            const { icon: StageIcon, color, bg } = stageConfig[stage];
            const stageDeals = deals.filter((d) => d.stage === stage);
            return (
              <div key={stage} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center`}>
                      <StageIcon size={12} className={color} />
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{stage}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {stageDeals.length === 0 && (
                    <div className="text-[10px] text-gray-400 text-center py-4">Nenhum deal</div>
                  )}
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{deal.company}</div>
                          <div className="text-[10px] text-gray-500">{deal.sector}</div>
                        </div>
                        <span className={`shrink-0 ${priorityBadge[deal.priority] ?? "badge"} text-[9px]`}>
                          {deal.priority}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{deal.description}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                        <span className="text-[10px] font-bold text-amber-700">{fmtR(deal.ticket)}</span>
                        <span className="text-[10px] text-gray-500">{deal.eta}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Score: <span className="text-gray-300 font-semibold">{deal.score}</span></span>
                        <span className="text-[10px] text-gray-500">{deal.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Deal List ────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Todos os Deals</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Empresa</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Setor</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Stage</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ticket</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Score</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Prioridade</th>
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Origem</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ETA</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => {
                  const { icon: StageIcon, color } = stageConfig[d.stage] ?? { icon: Clock, color: "text-gray-400" };
                  return (
                    <tr key={d.id} className="border-b border-gray-200/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-xs font-medium text-gray-800">{d.company}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[180px]">{d.description.slice(0, 50)}…</div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{d.sector}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold">
                          <StageIcon size={10} className={color} />
                          <span className="text-gray-700">{d.stage}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-700">{fmtR(d.ticket)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`text-xs font-bold ${d.score >= 8 ? "text-emerald-600" : d.score >= 7 ? "text-amber-700" : "text-gray-500"}`}>
                          {d.score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={priorityBadge[d.priority] ?? "badge"}>{d.priority}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{d.source}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400">{d.eta}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

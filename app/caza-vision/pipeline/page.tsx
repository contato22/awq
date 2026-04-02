import Header from "@/components/Header";
import { projetos, cazaClients, projectTypeRevenue } from "@/lib/caza-data";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Film,
  DollarSign,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ─── Pipeline stages ──────────────────────────────────────────────────────────

const stageConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  "Aguardando Aprovação": { icon: AlertTriangle, color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  "Em Produção":          { icon: Clock,         color: "text-brand-600",   bg: "bg-brand-50",   border: "border-brand-200" },
  "Em Edição":            { icon: Film,          color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
  "Entregue":             { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const stageOrder = ["Aguardando Aprovação", "Em Produção", "Em Edição", "Entregue"] as const;

// ─── Propostas mock (pre-pipeline) ────────────────────────────────────────────

const propostas = [
  { id: "PP01", cliente: "Banco XP",      titulo: "Série Institucional Q2",    valor: 450_000, prazo: "2026-06-30", probabilidade: 75 },
  { id: "PP02", cliente: "Samsung Brasil", titulo: "Lançamento Galaxy AI",      valor: 280_000, prazo: "2026-05-20", probabilidade: 60 },
  { id: "PP03", cliente: "Ambev",          titulo: "Festival de Verão 2026",   valor: 620_000, prazo: "2026-07-15", probabilidade: 85 },
  { id: "PP04", cliente: "Natura",         titulo: "Campanha ESG Anual",       valor: 340_000, prazo: "2026-06-10", probabilidade: 50 },
  { id: "PP05", cliente: "Nubank",         titulo: "Conteúdo Produto Novo",    valor: 180_000, prazo: "2026-05-30", probabilidade: 70 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaPipelinePage() {
  const activeProjects = projetos.filter((p) => p.status !== "Entregue");
  const pipelineValue = activeProjects.reduce((s, p) => s + p.valor, 0);
  const propostasValue = propostas.reduce((s, p) => s + p.valor, 0);
  const propostasWeighted = propostas.reduce((s, p) => s + p.valor * (p.probabilidade / 100), 0);

  // Group projects by stage
  const byStage = stageOrder.map((stage) => ({
    stage,
    projects: projetos.filter((p) => p.status === stage),
    total: projetos.filter((p) => p.status === stage).reduce((s, p) => s + p.valor, 0),
  }));

  // Client concentration
  const clientRevenue = cazaClients
    .filter((c) => c.status === "Ativo" || c.status === "Em Proposta")
    .sort((a, b) => b.budget_anual - a.budget_anual);
  const totalBudget = clientRevenue.reduce((s, c) => s + c.budget_anual, 0);

  return (
    <>
      <Header
        title="Pipeline — Caza Vision"
        subtitle={`${activeProjects.length} projetos ativos · ${fmtCurrency(pipelineValue)} em execução`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary KPIs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Projetos Ativos",      value: String(activeProjects.length), icon: Film,       color: "text-emerald-600", bg: "bg-slate-100" },
            { label: "Em Execução",          value: fmtCurrency(pipelineValue),    icon: DollarSign, color: "text-brand-600",   bg: "bg-slate-100" },
            { label: "Propostas Ativas",     value: fmtCurrency(propostasValue),   icon: TrendingUp, color: "text-amber-700",   bg: "bg-slate-100" },
            { label: "Propostas (ponderado)", value: fmtCurrency(propostasWeighted), icon: DollarSign, color: "text-violet-700",  bg: "bg-slate-100" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card-elevated p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={kpi.color} />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Kanban by Stage ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {byStage.map(({ stage, projects, total }) => {
            const cfg = stageConfig[stage];
            const Icon = cfg?.icon ?? Clock;
            return (
              <div key={stage} className="card-elevated p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon size={13} className={cfg?.color ?? "text-gray-500"} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800">{stage}</span>
                      <div className="text-[10px] text-emerald-600 font-bold">{fmtCurrency(total)}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {projects.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {projects.length === 0 && (
                    <div className="text-[10px] text-gray-500 text-center py-4">Nenhum projeto</div>
                  )}
                  {projects.map((p) => (
                    <div key={p.id} className={`p-3 rounded-xl bg-white border ${cfg?.border ?? "border-gray-200"} space-y-1.5`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">{p.titulo}</div>
                          <div className="text-[10px] text-gray-500">{p.cliente}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-emerald-600">{fmtCurrency(p.valor)}</span>
                        <span className="text-gray-500">{p.prazo}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{p.diretor}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Propostas + Concentração ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Propostas em negociação */}
          <div className="card-elevated p-5">
            <h2 className="section-title mb-4">Propostas em Negociação</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="text-left py-2 px-3 text-xs font-bold text-white">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-white">Projeto</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-white">Valor</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-white">Prob.</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-white">Ponderado</th>
                  </tr>
                </thead>
                <tbody>
                  {propostas.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-100 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-medium text-slate-800">{p.cliente}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500 truncate max-w-[180px]">{p.titulo}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtCurrency(p.valor)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`text-xs font-bold ${p.probabilidade >= 70 ? "text-blue-600" : p.probabilidade >= 50 ? "text-[#C9A84C]" : "text-red-600"}`}>
                          {p.probabilidade}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                        {fmtCurrency(p.valor * (p.probabilidade / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td colSpan={2} className="py-2 px-3 text-xs font-bold text-gray-500">Total</td>
                    <td className="py-2 px-3 text-right text-xs font-bold text-emerald-600">{fmtCurrency(propostasValue)}</td>
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3 text-right text-xs font-bold text-emerald-600">{fmtCurrency(propostasWeighted)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Concentração de clientes */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Concentração de Clientes</h2>
              <div className="flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-700" />
                <span className="text-[10px] text-amber-700 font-semibold">Risco de concentração</span>
              </div>
            </div>
            <div className="space-y-3">
              {clientRevenue.slice(0, 6).map((c) => {
                const pct = totalBudget > 0 ? (c.budget_anual / totalBudget) * 100 : 0;
                const isRisky = pct > 25;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-800 font-medium">{c.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          c.status === "Ativo" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                          c.status === "Em Proposta" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        {isRisky && <AlertTriangle size={10} className="text-red-500" />}
                        <span className={`font-bold ${isRisky ? "text-red-600" : "text-blue-600"}`}>
                          {pct.toFixed(0)}%
                        </span>
                        <span className="text-gray-500">{fmtCurrency(c.budget_anual)}/ano</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isRisky ? "bg-red-400" : "bg-gradient-to-r from-slate-700 to-slate-500"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 text-[10px] text-gray-500">
              Budget total gerenciado: <span className="font-bold text-emerald-600">{fmtCurrency(totalBudget)}</span>/ano
            </div>
          </div>
        </div>

        {/* ── Revenue by Project Type ──────────────────────────────────────── */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Receita por Tipo de Projeto</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th className="text-left py-2 px-3 text-xs font-bold text-white">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Projetos</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Ticket Médio</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">% Receita</th>
                </tr>
              </thead>
              <tbody>
                {projectTypeRevenue.map((pt) => {
                  const totalReceita = projectTypeRevenue.reduce((s, r) => s + r.receita, 0);
                  const share = ((pt.receita / totalReceita) * 100).toFixed(0);
                  return (
                    <tr key={pt.type} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-100 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-medium text-slate-800">{pt.type}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{pt.projetos}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtCurrency(pt.receita)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtCurrency(pt.avgValue)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-blue-600 font-bold">{share}%</td>
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

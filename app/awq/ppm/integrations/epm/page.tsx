"use client";

// ─── /awq/ppm/integrations/epm — EPM Integration ─────────────────────────────
// Project costs → GL · Revenue → AR · Budget → EPM Budget module

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Plug, CheckCircle2, AlertTriangle,
  ArrowRight, DollarSign, BarChart3, FileText, Clock,
  ChevronRight, Play,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { ppmFetch } from "@/lib/ppm-fetch";
import type { PpmProject, PpmEpmSync } from "@/lib/ppm-types";

type SyncStatus = "synced" | "pending" | "error" | "never";

interface GlMapping {
  project_id:    string;
  project_name:  string;
  project_code:  string;
  bu_code:       string;
  gl_cost_account:    string;
  gl_revenue_account: string;
  budget_cost:   number;
  actual_cost:   number;
  budget_revenue:number;
  actual_revenue:number;
  last_sync:     string | null;
  sync_status:   SyncStatus;
}

const SYNC_CONFIG: Record<SyncStatus, { label: string; color: string; icon: React.ElementType }> = {
  synced:  { label: "Sincronizado",  color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  pending: { label: "Pendente",      color: "text-amber-700  bg-amber-50  border-amber-200",     icon: Clock        },
  error:   { label: "Erro",          color: "text-red-700    bg-red-50    border-red-200",        icon: AlertTriangle},
  never:   { label: "Não Exportado", color: "text-gray-600   bg-gray-50   border-gray-200",       icon: AlertTriangle},
};

// GL account mapping rules (cost centre by BU)
const GL_COST: Record<string, string> = {
  JACQES:  "4.1.01.001 — Custo Serv. JACQES",
  CAZA:    "4.1.02.001 — Custo Prod. Caza Vision",
  ADVISOR: "4.1.03.001 — Custo Consult. Advisor",
  VENTURE: "4.1.04.001 — Custo Venture",
  AWQ:     "4.1.05.001 — Custo Corporativo AWQ",
};
const GL_REVENUE: Record<string, string> = {
  JACQES:  "3.1.01.001 — Receita Serv. JACQES",
  CAZA:    "3.1.02.001 — Receita Prod. Caza Vision",
  ADVISOR: "3.1.03.001 — Receita Consult. Advisor",
  VENTURE: "3.1.04.001 — Receita Venture",
  AWQ:     "3.1.05.001 — Receita Corporativa AWQ",
};

function buildMappings(projects: PpmProject[], syncs: PpmEpmSync[], flow: string): GlMapping[] {
  const syncByProject = new Map(syncs.filter(s => s.flow === flow).map(s => [s.project_id, s]));
  return projects.filter(p => p.status !== "cancelled").map(p => {
    const syncEntry = syncByProject.get(p.project_id);
    return {
      project_id:          p.project_id,
      project_name:        p.project_name,
      project_code:        p.project_code,
      bu_code:             p.bu_code,
      gl_cost_account:     GL_COST[p.bu_code]    ?? "4.1.99.001 — Custo Outros",
      gl_revenue_account:  GL_REVENUE[p.bu_code] ?? "3.1.99.001 — Receita Outros",
      budget_cost:         p.budget_cost,
      actual_cost:         p.actual_cost,
      budget_revenue:      p.budget_revenue,
      actual_revenue:      p.actual_revenue,
      last_sync:           syncEntry ? syncEntry.synced_at.slice(0, 10) : null,
      sync_status:         (syncEntry?.status ?? "never") as SyncStatus,
    };
  });
}

type IntegrationFlow = "cost_to_gl" | "revenue_to_ar" | "budget_to_epm";

const FLOWS: { id: IntegrationFlow; label: string; desc: string; icon: React.ElementType; from: string; to: string }[] = [
  {
    id:    "cost_to_gl",
    label: "Custos → Contabilidade (GL)",
    desc:  "Exporta custos reais dos projetos para as contas de Custo de Serviços Prestados no Razão Geral",
    icon:  DollarSign,
    from:  "PPM · Custos Reais",
    to:    "EPM · GL — Plano de Contas",
  },
  {
    id:    "revenue_to_ar",
    label: "Receita → Contas a Receber (AR)",
    desc:  "Reconhecimento de receita por projeto com base em marcos atingidos e horas aprovadas",
    icon:  BarChart3,
    from:  "PPM · Revenue Real",
    to:    "EPM · AR — Faturamento",
  },
  {
    id:    "budget_to_epm",
    label: "Orçamento → Módulo de Budget",
    desc:  "Sincroniza o orçamento do projeto com o módulo EPM de planejamento orçamentário",
    icon:  FileText,
    from:  "PPM · Budget",
    to:    "EPM · Budget Module",
  },
];

const FLOW_API_KEY: Record<IntegrationFlow, string> = {
  cost_to_gl:     "cost_gl",
  revenue_to_ar:  "revenue_ar",
  budget_to_epm:  "budget_epm",
};

export default function EpmIntegrationPage() {
  const [projects,     setProjects]     = useState<PpmProject[]>([]);
  const [syncs,        setSyncs]        = useState<PpmEpmSync[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState<Record<string, boolean>>({});
  const [syncAll,      setSyncAll]      = useState(false);
  const [activeFlow,   setActiveFlow]   = useState<IntegrationFlow>("cost_to_gl");
  const [filterBU,     setFilterBU]     = useState("");
  const [lastFullSync, setLastFullSync] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projJson, syncJson] = await Promise.all([
        ppmFetch("/api/ppm/projects"),
        ppmFetch("/api/ppm/epm-sync"),
      ]) as [
        { success: boolean; data: { projects: PpmProject[] } },
        { success: boolean; data: PpmEpmSync[] },
      ];
      if (projJson.success) setProjects(projJson.data.projects ?? []);
      if (syncJson.success) setSyncs(syncJson.data ?? []);
    } catch { /* keep */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function syncProject(project: PpmProject) {
    const flowKey = FLOW_API_KEY[activeFlow];
    const gl_account = activeFlow === "cost_to_gl"
      ? GL_COST[project.bu_code]    ?? "4.1.99.001 — Custo Outros"
      : activeFlow === "revenue_to_ar"
      ? GL_REVENUE[project.bu_code] ?? "3.1.99.001 — Receita Outros"
      : `BDG.${project.project_code}`;
    const amount = activeFlow === "cost_to_gl"
      ? project.actual_cost
      : activeFlow === "revenue_to_ar"
      ? project.actual_revenue
      : project.budget_cost + project.budget_revenue;

    setSyncing(prev => ({ ...prev, [project.project_id]: true }));
    try {
      const json = await ppmFetch("/api/ppm/epm-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.project_id, flow: flowKey, gl_account, amount }),
      }) as { success: boolean; data: PpmEpmSync };
      if (json.success) setSyncs(prev => {
        const filtered = prev.filter(s => !(s.project_id === project.project_id && s.flow === flowKey));
        return [json.data, ...filtered];
      });
    } catch { /* ignore */ } finally {
      setSyncing(prev => ({ ...prev, [project.project_id]: false }));
    }
  }

  async function syncAllProjects() {
    const visibleProjects = filterBU ? projects.filter(p => p.bu_code === filterBU) : projects;
    setSyncAll(true);
    await Promise.all(visibleProjects.filter(p => p.status !== "cancelled").map(p => syncProject(p)));
    setLastFullSync(new Date().toISOString().slice(0, 10));
    setSyncAll(false);
  }

  const visibleProjects = filterBU ? projects.filter(p => p.bu_code === filterBU) : projects;
  const mappings = buildMappings(visibleProjects, syncs, FLOW_API_KEY[activeFlow]);

  const syncedCount  = mappings.filter(m => m.sync_status === "synced").length;
  const pendingCount = mappings.filter(m => m.sync_status === "pending" || m.sync_status === "never").length;
  const errorCount   = mappings.filter(m => m.sync_status === "error").length;
  const totalCost    = mappings.reduce((s, m) => s + m.actual_cost, 0);
  const totalRevenue = mappings.reduce((s, m) => s + m.actual_revenue, 0);

  const currentFlow = FLOWS.find(f => f.id === activeFlow)!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Plug size={15} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Integração EPM</h1>
                <p className="text-xs text-gray-500">PPM → Contabilidade · AR · Budget Module</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <select value={filterBU} onChange={e => setFilterBU(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
              <option value="">Todas BUs</option>
              <option value="JACQES">JACQES</option>
              <option value="CAZA">Caza Vision</option>
              <option value="ADVISOR">Advisor</option>
              <option value="VENTURE">Venture</option>
            </select>
            <button onClick={() => void syncAllProjects()} disabled={syncAll}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition-colors">
              <Play size={13} className={syncAll ? "animate-pulse" : ""} />
              {syncAll ? "Exportando…" : "Exportar Tudo"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Status KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Sincronizados", value: syncedCount,  color: "text-emerald-600" },
            { label: "Pendentes",     value: pendingCount, color: "text-amber-600"   },
            { label: "Com Erro",      value: errorCount,   color: "text-red-600"     },
            { label: "Custo Total",   value: formatBRL(totalCost),    color: "text-gray-900" },
            { label: "Revenue Total", value: formatBRL(totalRevenue), color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {lastFullSync && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={14} /> Última exportação completa: {formatDateBR(lastFullSync)} — {mappings.length} projetos exportados com sucesso.
          </div>
        )}

        {/* Integration Flow Selector */}
        <div className="grid grid-cols-3 gap-4">
          {FLOWS.map(flow => {
            const Icon = flow.icon;
            return (
              <button key={flow.id} onClick={() => setActiveFlow(flow.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeFlow === flow.id
                    ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className={`flex items-center gap-2 font-bold text-sm mb-1 ${activeFlow === flow.id ? "text-indigo-700" : "text-gray-800"}`}>
                  <Icon size={13} /> {flow.label}
                </div>
                <p className="text-[10px] text-gray-500 mb-3">{flow.desc}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{flow.from}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{flow.to}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mapping Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {currentFlow.label} — Mapeamento por Projeto
            </div>
            <div className="text-[10px] text-gray-400">
              {currentFlow.from} → {currentFlow.to}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Projeto","BU",
                    activeFlow === "cost_to_gl"      ? "Conta GL (Custo)" :
                    activeFlow === "revenue_to_ar"   ? "Conta AR (Receita)" :
                                                       "Conta Budget EPM",
                    activeFlow === "cost_to_gl"      ? "Budget Custo" :
                    activeFlow === "revenue_to_ar"   ? "Budget Revenue" :
                                                       "Budget Total",
                    activeFlow === "cost_to_gl"      ? "Custo Real" :
                    activeFlow === "revenue_to_ar"   ? "Revenue Real" :
                                                       "Budget Sync",
                    "Status","Última Sync",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Carregando…</td></tr>
                ) : mappings.map(m => {
                  const cfg  = SYNC_CONFIG[m.sync_status];
                  const Icon = cfg.icon;
                  const isSyncing = !!syncing[m.project_id];
                  return (
                    <tr key={m.project_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 max-w-48 truncate">{m.project_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{m.project_code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.bu_code}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-gray-700 max-w-56 truncate">
                          {activeFlow === "cost_to_gl"    ? m.gl_cost_account :
                           activeFlow === "revenue_to_ar" ? m.gl_revenue_account :
                                                            `BDG.${m.project_code}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                        {formatBRL(activeFlow === "cost_to_gl" ? m.budget_cost : activeFlow === "revenue_to_ar" ? m.budget_revenue : m.budget_cost + m.budget_revenue)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                        {formatBRL(activeFlow === "cost_to_gl" ? m.actual_cost : activeFlow === "revenue_to_ar" ? m.actual_revenue : m.budget_cost + m.budget_revenue)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border w-fit ${cfg.color}`}>
                          <Icon size={10} /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {m.last_sync ? formatDateBR(m.last_sync) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { const p = projects.find(x => x.project_id === m.project_id); if (p) void syncProject(p); }} disabled={isSyncing}
                          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-50 disabled:opacity-60">
                          <Play size={9} className={isSyncing ? "animate-pulse" : ""} />
                          {isSyncing ? "…" : "Exportar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* GL Account Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <BarChart3 size={12} /> Consolidação por Conta GL
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(activeFlow === "revenue_to_ar" ? GL_REVENUE : GL_COST).map(([bu, account]) => {
              const buMappings = mappings.filter(m => m.bu_code === bu);
              const total = buMappings.reduce((s, m) =>
                s + (activeFlow === "cost_to_gl" ? m.actual_cost : activeFlow === "revenue_to_ar" ? m.actual_revenue : m.budget_cost + m.budget_revenue)
              , 0);
              if (total === 0) return null;
              return (
                <div key={bu} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="text-[10px] font-mono text-gray-500">{account}</div>
                      <div className="text-xs font-bold text-gray-700 mt-0.5">{bu}</div>
                    </div>
                    <div className="text-base font-bold text-gray-900">{formatBRL(total)}</div>
                  </div>
                  <div className="text-[10px] text-gray-400">{buMappings.length} projeto(s)</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

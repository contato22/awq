"use client";

// ─── /awq/ppm/integrations/crm — CRM Integration ─────────────────────────────
// Opportunity → Project · Customer → Project client · Link existing

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Link as LinkIcon, Plus, ArrowRight,
  CheckCircle2, Circle, TrendingUp, Briefcase, Users,
  ChevronRight, X, Save,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { ppmFetch } from "@/lib/ppm-fetch";
import type { PpmProject, PpmCrmOpportunity as CrmOpportunity } from "@/lib/ppm-types";

const STAGE_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  "Qualificação":     { color: "bg-gray-100    text-gray-600",    icon: Circle       },
  "Proposta Enviada": { color: "bg-blue-100    text-blue-700",    icon: TrendingUp   },
  "Negociação":       { color: "bg-amber-100   text-amber-700",   icon: TrendingUp   },
  "Fechado Ganho":    { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  "Fechado Perdido":  { color: "bg-red-100     text-red-700",     icon: X            },
};

const BU_CHIP: Record<string, string> = {
  JACQES:  "bg-brand-100  text-brand-700",
  CAZA:    "bg-violet-100 text-violet-700",
  ADVISOR: "bg-emerald-100 text-emerald-700",
  VENTURE: "bg-amber-100  text-amber-700",
};

const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";
const SELECT = INPUT;

export default function CrmIntegrationPage() {
  const [projects,      setProjects]      = useState<PpmProject[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [converting,    setConverting]    = useState<string | null>(null);

  // Link modal
  const [linkOpp,       setLinkOpp]       = useState<CrmOpportunity | null>(null);
  const [linkProjectId, setLinkProjectId] = useState("");

  // Convert form
  const [convertOpp,    setConvertOpp]    = useState<CrmOpportunity | null>(null);
  const [convertForm,   setConvertForm]   = useState({
    project_type: "one_off", contract_type: "fixed_price",
    start_date: new Date().toISOString().slice(0, 10),
    planned_end_date: "",
    project_manager: "Miguel",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projJson, oppJson] = await Promise.all([
        ppmFetch("/api/ppm/projects"),
        ppmFetch("/api/ppm/crm-opportunities"),
      ]) as [
        { success: boolean; data: { projects: PpmProject[] } },
        { success: boolean; data: CrmOpportunity[] },
      ];
      if (projJson.success) setProjects(projJson.data.projects ?? []);
      if (oppJson.success)  setOpportunities(oppJson.data ?? []);
    } catch { /* keep */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function convertToProject(opp: CrmOpportunity) {
    setConverting(opp.opportunity_id);
    try {
      const res = await ppmFetch("/api/ppm/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name:     opp.title,
          customer_name:    opp.customer_name,
          bu_code:          opp.bu_code,
          opportunity_id:   opp.opportunity_id,
          project_type:     convertForm.project_type,
          contract_type:    convertForm.contract_type,
          start_date:       convertForm.start_date,
          planned_end_date: convertForm.planned_end_date || convertForm.start_date,
          budget_revenue:   opp.value,
          budget_cost:      Math.round(opp.value * 0.35),
          phase:            "initiation",
          status:           "active",
          health_status:    "green",
          priority:         opp.probability >= 80 ? "high" : "medium",
          project_manager:  convertForm.project_manager,
        }),
      }) as { success: boolean; data: PpmProject };
      if (res.success) {
        await ppmFetch("/api/ppm/crm-opportunities", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opportunity_id:    opp.opportunity_id,
            linked_project_id: res.data.project_id,
            stage:             "Fechado Ganho",
          }),
        });
        setConvertOpp(null);
        void load();
      }
    } finally {
      setConverting(null);
    }
  }

  async function linkToExisting() {
    if (!linkOpp || !linkProjectId) return;
    try {
      await ppmFetch("/api/ppm/crm-opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id:    linkOpp.opportunity_id,
          linked_project_id: linkProjectId,
          stage:             "Fechado Ganho",
        }),
      });
      setLinkOpp(null);
      setLinkProjectId("");
      void load();
    } catch { /* ignore */ }
  }

  const linked   = opportunities.filter(o => o.linked_project_id);
  const unlinked = opportunities.filter(o => !o.linked_project_id && o.stage !== "Fechado Perdido");
  const pipeline = opportunities.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
  const pipelineValue = pipeline.reduce((s, o) => s + o.value * (o.probability / 100), 0);

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
              <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
                <LinkIcon size={15} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Integração CRM</h1>
                <p className="text-xs text-gray-500">Opportunity → Projeto · Cliente → Projeto</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <Link href="/awq/ppm/add" className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 shadow-sm">
              <Plus size={13} /> Novo Projeto Manual
            </Link>
          </div>
        </div>
      </div>

      {/* Convert Modal */}
      {convertOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Converter Oportunidade → Projeto</h2>
              <button onClick={() => setConvertOpp(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={14} />
              </button>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-4">
              <div className="text-sm font-bold text-gray-900">{convertOpp.title}</div>
              <div className="text-xs text-gray-500">{convertOpp.customer_name} · {formatBRL(convertOpp.value)}</div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de Projeto</label>
                  <select value={convertForm.project_type} onChange={e => setConvertForm(f => ({ ...f, project_type: e.target.value }))} className={SELECT}>
                    <option value="one_off">One-off</option>
                    <option value="retainer">Retainer</option>
                    <option value="internal">Interno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contrato</label>
                  <select value={convertForm.contract_type} onChange={e => setConvertForm(f => ({ ...f, contract_type: e.target.value }))} className={SELECT}>
                    <option value="fixed_price">Preço Fixo</option>
                    <option value="time_and_materials">T&M</option>
                    <option value="retainer">Retainer</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Início</label>
                  <input type="date" value={convertForm.start_date} onChange={e => setConvertForm(f => ({ ...f, start_date: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prazo Previsto</label>
                  <input type="date" value={convertForm.planned_end_date} onChange={e => setConvertForm(f => ({ ...f, planned_end_date: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Project Manager</label>
                <input value={convertForm.project_manager} onChange={e => setConvertForm(f => ({ ...f, project_manager: e.target.value }))} className={INPUT} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <div><span className="font-semibold">Budget Revenue:</span> {formatBRL(convertOpp.value)}</div>
                <div><span className="font-semibold">Budget Custo (est. 35%):</span> {formatBRL(convertOpp.value * 0.35)}</div>
                <div><span className="font-semibold">Margem Est.:</span> 65%</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConvertOpp(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={() => void convertToProject(convertOpp)} disabled={!!converting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60">
                <Briefcase size={13} /> {converting ? "Criando…" : "Criar Projeto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {linkOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Vincular a Projeto Existente</h2>
              <button onClick={() => setLinkOpp(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">{linkOpp.title}</p>
            <select value={linkProjectId} onChange={e => setLinkProjectId(e.target.value)} className={SELECT + " mb-4"}>
              <option value="">Selecionar projeto…</option>
              {projects.filter(p => p.status === "active").map(p => (
                <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLinkOpp(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={linkToExisting} disabled={!linkProjectId}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60">
                <Save size={13} /> Vincular
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Oportunidades",        value: String(opportunities.length),      color: "text-gray-900"    },
            { label: "Pipeline Ponderado",   value: formatBRL(pipelineValue),          color: "text-brand-600"   },
            { label: "Vinculadas a Projeto", value: String(linked.length),             color: "text-emerald-600" },
            { label: "Aguardando Conversão", value: String(unlinked.length),           color: "text-amber-600"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Unlinked Opportunities */}
        {unlinked.length > 0 && (
          <section>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Circle size={10} className="text-amber-500" /> Oportunidades sem Projeto ({unlinked.length})
            </div>
            <div className="space-y-3">
              {unlinked.map(opp => {
                const stageCfg = STAGE_CONFIG[opp.stage] ?? { color: "bg-gray-100 text-gray-600", icon: Circle };
                const StageIcon = stageCfg.icon;
                return (
                  <div key={opp.opportunity_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 truncate">{opp.title}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${stageCfg.color}`}>
                          <StageIcon size={9} /> {opp.stage}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BU_CHIP[opp.bu_code] ?? ""}`}>
                          {opp.bu_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span><Users size={10} className="inline mr-1" />{opp.customer_name}</span>
                        <span><TrendingUp size={10} className="inline mr-1" />{opp.probability}% prob.</span>
                        <span>Fecha: {formatDateBR(opp.expected_close)}</span>
                        <span className="font-bold text-gray-900">{formatBRL(opp.value)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setLinkOpp(opp); setLinkProjectId(""); }}
                        className="flex items-center gap-1 text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">
                        <LinkIcon size={11} /> Vincular
                      </button>
                      <button onClick={() => setConvertOpp(opp)}
                        className="flex items-center gap-1 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700">
                        <ArrowRight size={11} /> Converter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Linked: opportunity ↔ project */}
        <section>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckCircle2 size={10} className="text-emerald-500" /> Oportunidades Vinculadas ({linked.length})
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Oportunidade","Cliente","BU","Valor","Stage","Projeto Vinculado",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {linked.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma oportunidade vinculada.</td></tr>
                ) : linked.map(opp => {
                  const linkedProj = projects.find(p => p.project_id === opp.linked_project_id);
                  const stageCfg = STAGE_CONFIG[opp.stage] ?? { color: "bg-gray-100 text-gray-600", icon: Circle };
                  const StageIcon = stageCfg.icon;
                  return (
                    <tr key={opp.opportunity_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 max-w-48 truncate">{opp.title}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-36 truncate">{opp.customer_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BU_CHIP[opp.bu_code] ?? ""}`}>{opp.bu_code}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">{formatBRL(opp.value)}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded w-fit ${stageCfg.color}`}>
                          <StageIcon size={9} /> {opp.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {linkedProj ? (
                          <Link href={`/awq/ppm/${linkedProj.project_id}`}
                            className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-semibold">
                            {linkedProj.project_name} <ChevronRight size={11} />
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Projeto removido</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setOpportunities(prev => prev.map(o =>
                          o.opportunity_id === opp.opportunity_id ? { ...o, linked_project_id: undefined } : o
                        ))} className="text-[10px] text-gray-300 hover:text-red-500" title="Desvincular">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

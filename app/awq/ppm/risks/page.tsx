"use client";

// ─── /awq/ppm/risks — Risk Register ──────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Plus, X, Save, RefreshCw, Shield } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { ppmFetch } from "@/lib/ppm-fetch";
import type { PpmRisk, PpmProject } from "@/lib/ppm-types";

type RiskStatus = "identified" | "mitigating" | "occurred" | "closed";

const SCORE_COLOR = (s: number) =>
  s >= 6 ? "bg-red-100 text-red-700 border-red-200" :
  s >= 3 ? "bg-amber-100 text-amber-700 border-amber-200" :
           "bg-emerald-100 text-emerald-700 border-emerald-200";

const SCORE_LABEL = (s: number) => s >= 6 ? "Alto" : s >= 3 ? "Médio" : "Baixo";

const STATUS_BADGE: Record<RiskStatus, string> = {
  identified: "bg-blue-100 text-blue-700",
  mitigating: "bg-amber-100 text-amber-700",
  occurred:   "bg-red-100 text-red-700",
  closed:     "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<RiskStatus, string> = {
  identified: "Identificado", mitigating: "Mitigando", occurred: "Ocorrido", closed: "Fechado",
};

const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";
const SELECT = INPUT;

export default function RisksPage() {
  const [risks,    setRisks]    = useState<PpmRisk[]>([]);
  const [projects, setProjects] = useState<PpmProject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");

  const [form, setForm] = useState({
    project_id: "", risk_description: "",
    impact: "medium", probability: "medium",
    mitigation_plan: "", contingency_plan: "",
    status: "identified",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Preview score
  const previewScore = (() => {
    const m: Record<string, number> = { low:1, medium:2, high:3 };
    return m[form.impact] * m[form.probability];
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("project_id", filterProject);
      const [risksJson, projectsJson] = await Promise.all([
        ppmFetch(`/api/ppm/risks?${params}`),
        ppmFetch("/api/ppm/projects"),
      ]) as [{ success: boolean; data: PpmRisk[] }, { success: boolean; data: { projects: PpmProject[] } }];
      if (risksJson.success) setRisks(risksJson.data);
      if (projectsJson.success) {
        const projs: PpmProject[] = projectsJson.data.projects ?? [];
        setProjects(projs);
        setForm(f => ({ ...f, project_id: f.project_id || (projs[0]?.project_id ?? "") }));
      }
    } finally {
      setLoading(false);
    }
  }, [filterProject]);

  useEffect(() => { void load(); }, [load]);

  async function submitRisk(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id) { setError("Selecione o projeto"); return; }
    if (!form.risk_description.trim()) { setError("Descreva o risco"); return; }
    setSaving(true); setError("");
    try {
      const json = await ppmFetch("/api/ppm/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, identified_date: new Date().toISOString().slice(0,10) }),
      }) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error);
      setShowForm(false);
      setForm(f => ({ ...f, risk_description:"", mitigation_plan:"", contingency_plan:"" }));
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = filterStatus ? risks.filter(r => r.status === filterStatus) : risks;
  const highRisks = risks.filter(r => (r.risk_score ?? 0) >= 6 && r.status !== "closed").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Registro de Riscos</h1>
              <p className="text-xs text-gray-500">{risks.length} riscos cadastrados · {highRisks} alto risco</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={14} /> Novo Risco
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Riscos Totais", value: String(risks.length),                                      color:"text-gray-900" },
            { label: "Alto Risco",   value: String(risks.filter(r=>(r.risk_score??0)>=6).length),       color:"text-red-600" },
            { label: "Mitigando",    value: String(risks.filter(r=>r.status==="mitigating").length),    color:"text-amber-600" },
            { label: "Fechados",     value: String(risks.filter(r=>r.status==="closed").length),        color:"text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="text-sm font-bold text-gray-800">Novo Risco</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={14} />
              </button>
            </div>
            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</div>}
            <form onSubmit={e => void submitRisk(e)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Projeto</label>
                  <select value={form.project_id} onChange={set("project_id")} className={SELECT}>
                    <option value="">Selecionar projeto…</option>
                    {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={form.status} onChange={set("status")} className={SELECT}>
                    <option value="identified">Identificado</option>
                    <option value="mitigating">Mitigando</option>
                    <option value="occurred">Ocorrido</option>
                    <option value="closed">Fechado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição do Risco *</label>
                <textarea rows={2} value={form.risk_description} onChange={set("risk_description")} placeholder="O que pode dar errado?" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Impacto</label>
                  <select value={form.impact} onChange={set("impact")} className={SELECT}>
                    <option value="low">Baixo</option>
                    <option value="medium">Médio</option>
                    <option value="high">Alto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Probabilidade</label>
                  <select value={form.probability} onChange={set("probability")} className={SELECT}>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg border text-xs font-semibold ${SCORE_COLOR(previewScore)}`}>
                Score de Risco: {previewScore}/9 — {SCORE_LABEL(previewScore)}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Plano de Mitigação</label>
                <textarea rows={2} value={form.mitigation_plan} onChange={set("mitigation_plan")} placeholder="Como prevenir ou reduzir este risco?" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Plano de Contingência</label>
                <textarea rows={2} value={form.contingency_plan} onChange={set("contingency_plan")} placeholder="O que fazer se o risco ocorrer?" className={INPUT} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60">
                  <Save size={13} /> {saving ? "Salvando…" : "Registrar Risco"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
          >
            <option value="">Todos Projetos</option>
            {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
          >
            <option value="">Todos Status</option>
            <option value="identified">Identificado</option>
            <option value="mitigating">Mitigando</option>
            <option value="occurred">Ocorrido</option>
            <option value="closed">Fechado</option>
          </select>
        </div>

        {/* Risk Matrix Legend */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Shield size={12} /> Matriz de Risco (Impacto × Probabilidade)
          </div>
          <div className="flex gap-3 flex-wrap">
            {[{s:1,l:"Baixo (1-2)"},{s:4,l:"Médio (3-5)"},{s:6,l:"Alto (6-9)"}].map(({s,l}) => (
              <span key={s} className={`text-[10px] font-bold px-2 py-1 rounded border ${SCORE_COLOR(s)}`}>{l}</span>
            ))}
          </div>
        </div>

        {/* Risks Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["Score","Risco","Projeto","Impacto","Prob.","Mitigação","Status","Data",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Carregando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum risco encontrado.</td></tr>
              ) : filtered.sort((a,b) => (b.risk_score??0) - (a.risk_score??0)).map(risk => (
                <tr key={risk.risk_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${SCORE_COLOR(risk.risk_score ?? 0)}`}>
                      {risk.risk_score ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-sm text-gray-900 line-clamp-2">{risk.risk_description}</div>
                  </td>
                  <td className="px-4 py-3">
                    {risk.project_id && (
                      <Link href={`/awq/ppm/${risk.project_id}`} className="text-xs text-brand-600 hover:underline truncate block max-w-32">
                        {risk.project_name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">{risk.impact}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">{risk.probability}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-xs text-gray-600 line-clamp-2">{risk.mitigation_plan ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[risk.status as RiskStatus]}`}>
                      {STATUS_LABEL[risk.status as RiskStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDateBR(risk.identified_date)}
                  </td>
                  <td className="px-4 py-3">
                    {risk.project_id && (
                      <Link href={`/awq/ppm/${risk.project_id}#risks`} className="text-[10px] text-gray-400 hover:text-brand-600">Ver →</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

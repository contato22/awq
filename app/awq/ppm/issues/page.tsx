"use client";

// ─── /awq/ppm/issues — Issue Tracking ────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertCircle, Plus, X, Save, RefreshCw,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmIssue, PpmProject } from "@/lib/ppm-types";

type IssueStatus   = "open" | "in_progress" | "resolved" | "closed";
type IssueSeverity = "low" | "medium" | "high" | "critical";

const SEV_COLOR: Record<IssueSeverity, string> = {
  low:      "bg-gray-100   text-gray-600   border-gray-200",
  medium:   "bg-amber-100  text-amber-700  border-amber-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100    text-red-700    border-red-200",
};
const SEV_LABEL: Record<IssueSeverity, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
};

const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: "Aberto",       color: "bg-blue-100  text-blue-700",    icon: AlertCircle  },
  in_progress: { label: "Em Progresso", color: "bg-amber-100 text-amber-700",   icon: Clock        },
  resolved:    { label: "Resolvido",    color: "bg-emerald-100 text-emerald-700",icon: CheckCircle2 },
  closed:      { label: "Fechado",      color: "bg-gray-100  text-gray-500",    icon: XCircle      },
};

const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";
const SELECT = INPUT;

export default function IssuesPage() {
  const [issues,   setIssues]   = useState<PpmIssue[]>([]);
  const [projects, setProjects] = useState<PpmProject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const [filterProject,  setFilterProject]  = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  // Resolve modal state
  const [resolving, setResolving] = useState<PpmIssue | null>(null);
  const [resolution, setResolution] = useState("");

  const [form, setForm] = useState({
    project_id: "", issue_description: "",
    severity: "medium", status: "open",
    notes: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("project_id", filterProject);
      const [issuesRes, projectsRes] = await Promise.all([
        fetch(`/api/ppm/issues?${params}`),
        fetch("/api/ppm/projects"),
      ]);
      const [issuesJson, projectsJson] = await Promise.all([
        issuesRes.json(), projectsRes.json(),
      ]);
      if (issuesJson.success)   setIssues(issuesJson.data);
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

  async function submitIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id)          { setError("Selecione o projeto"); return; }
    if (!form.issue_description.trim()) { setError("Descreva o problema"); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/ppm/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, reported_date: new Date().toISOString().slice(0, 10) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setShowForm(false);
      setForm(f => ({ ...f, issue_description: "", notes: "" }));
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(issue: PpmIssue, status: IssueStatus) {
    const patch: Record<string, string> = { issue_id: issue.issue_id, status };
    if (status === "resolved" || status === "closed") {
      patch.resolved_date = new Date().toISOString().slice(0, 10);
    }
    await fetch("/api/ppm/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    void load();
  }

  async function submitResolution(e: React.FormEvent) {
    e.preventDefault();
    if (!resolving) return;
    await fetch("/api/ppm/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issue_id:     resolving.issue_id,
        status:       "resolved",
        resolution,
        resolved_date: new Date().toISOString().slice(0, 10),
      }),
    });
    setResolving(null);
    setResolution("");
    void load();
  }

  let filtered = issues;
  if (filterStatus)   filtered = filtered.filter(i => i.status   === filterStatus);
  if (filterSeverity) filtered = filtered.filter(i => i.severity === filterSeverity);

  const openCount     = issues.filter(i => i.status === "open").length;
  const criticalCount = issues.filter(i => i.severity === "critical" && i.status !== "closed").length;
  const inProgCount   = issues.filter(i => i.status === "in_progress").length;
  const resolvedCount = issues.filter(i => i.status === "resolved" || i.status === "closed").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Registro de Ocorrências</h1>
              <p className="text-xs text-gray-500">{issues.length} issues · {openCount} abertas · {criticalCount} críticas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={14} /> Nova Issue
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Abertas",     value: openCount,     color: "text-blue-600"    },
            { label: "Críticas",    value: criticalCount, color: "text-red-600"     },
            { label: "Em Progresso",value: inProgCount,   color: "text-amber-600"   },
            { label: "Resolvidas",  value: resolvedCount, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* New Issue Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500" />
                <h2 className="text-sm font-bold text-gray-800">Nova Ocorrência</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={14} />
              </button>
            </div>
            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</div>}
            <form onSubmit={e => void submitIssue(e)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Projeto *</label>
                  <select value={form.project_id} onChange={set("project_id")} className={SELECT}>
                    <option value="">Selecionar projeto…</option>
                    {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Severidade</label>
                  <select value={form.severity} onChange={set("severity")} className={SELECT}>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição da Ocorrência *</label>
                <textarea rows={3} value={form.issue_description} onChange={set("issue_description")}
                  placeholder="Descreva o problema em detalhe…" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Observações</label>
                <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Contexto adicional…" className={INPUT} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60">
                  <Save size={13} /> {saving ? "Salvando…" : "Registrar Issue"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Resolve Modal */}
        {resolving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Registrar Resolução</h2>
                <button onClick={() => setResolving(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{resolving.issue_description}</p>
              <form onSubmit={e => void submitResolution(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Como foi resolvido?</label>
                  <textarea rows={4} value={resolution} onChange={e => setResolution(e.target.value)}
                    placeholder="Descreva a solução aplicada…" className={INPUT} required />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setResolving(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    <CheckCircle2 size={13} /> Marcar Resolvido
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            <option value="">Todos Projetos</option>
            {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            <option value="">Todos Status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em Progresso</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            <option value="">Todas Severidades</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        {/* Issues Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["Severidade","Descrição","Projeto","Status","Reportado em","Resolvido em","Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Carregando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma ocorrência encontrada.</td></tr>
              ) : filtered.map(issue => {
                const sev = issue.severity as IssueSeverity;
                const st  = issue.status  as IssueStatus;
                const cfg = STATUS_CONFIG[st];
                const Icon = cfg.icon;
                return (
                  <tr key={issue.issue_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SEV_COLOR[sev]}`}>
                        {SEV_LABEL[sev]}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-sm text-gray-900 line-clamp-2">{issue.issue_description}</div>
                      {issue.resolution && (
                        <div className="text-[10px] text-emerald-600 mt-0.5 line-clamp-1">✓ {issue.resolution}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/awq/ppm/${issue.project_id}`} className="text-xs text-brand-600 hover:underline truncate block max-w-36">
                        {issue.project_name ?? issue.project_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${cfg.color}`}>
                        <Icon size={10} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateBR(issue.reported_date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {issue.resolved_date ? formatDateBR(issue.resolved_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {st === "open" && (
                          <>
                            <button onClick={() => void changeStatus(issue, "in_progress")}
                              className="text-[9px] font-semibold px-2 py-0.5 rounded border border-amber-200 text-amber-700 hover:bg-amber-50">
                              Iniciar
                            </button>
                            <button onClick={() => { setResolving(issue); setResolution(""); }}
                              className="text-[9px] font-semibold px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                              Resolver
                            </button>
                          </>
                        )}
                        {st === "in_progress" && (
                          <button onClick={() => { setResolving(issue); setResolution(""); }}
                            className="text-[9px] font-semibold px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            Resolver
                          </button>
                        )}
                        {st === "resolved" && (
                          <button onClick={() => void changeStatus(issue, "closed")}
                            className="text-[9px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
                            Fechar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              {filtered.length} ocorrência(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

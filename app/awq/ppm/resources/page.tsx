"use client";

// ─── /awq/ppm/resources — Resource Allocation & Utilization ──────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Users, AlertTriangle, CheckCircle2, Circle, Plus, RefreshCw, X, Save } from "lucide-react";
import type { PpmAllocation, PpmProject } from "@/lib/ppm-types";

type UtilRow = {
  user_id: string; user_name: string; email?: string;
  total_allocation_pct: number; utilization_status: string;
  active_projects: number; project_names: string[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  overallocated:     { label: "Superalocado",       color: "text-red-700",     bg: "bg-red-100 border-red-200",     icon: AlertTriangle },
  fully_allocated:   { label: "100% Alocado",       color: "text-amber-700",   bg: "bg-amber-100 border-amber-200", icon: CheckCircle2  },
  partially_allocated:{ label: "Parcialmente",      color: "text-brand-700",   bg: "bg-brand-100 border-brand-200", icon: Circle        },
  available:         { label: "Disponível",          color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: Circle     },
};

function UtilCard({ row }: { row: UtilRow }) {
  const cfg  = STATUS_CONFIG[row.utilization_status] ?? STATUS_CONFIG.available;
  const Icon = cfg.icon;
  const pct  = Math.min(row.total_allocation_pct, 120);

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${row.total_allocation_pct > 100 ? "border-red-200" : "border-gray-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-gray-900">{row.user_name}</div>
          {row.email && <div className="text-[10px] text-gray-400">{row.email}</div>}
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
          <Icon size={10} /> {cfg.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Alocação total</span>
          <span className={`font-bold ${row.total_allocation_pct > 100 ? "text-red-600" : "text-gray-900"}`}>
            {row.total_allocation_pct}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${row.total_allocation_pct > 100 ? "bg-red-500" : row.total_allocation_pct >= 80 ? "bg-amber-500" : "bg-brand-500"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <div className="text-[10px] text-gray-500 space-y-1">
        <div><span className="font-semibold text-gray-700">{row.active_projects}</span> projeto(s) ativo(s)</div>
        {row.project_names?.slice(0, 3).map(name => (
          <div key={name} className="truncate text-gray-400">· {name}</div>
        ))}
        {(row.project_names?.length ?? 0) > 3 && (
          <div className="text-gray-400">+{row.project_names.length - 3} mais</div>
        )}
      </div>
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";
const USERS = ["miguel", "danilo"] as const;

export default function ResourcesPage() {
  const [utilization,  setUtilization]  = useState<UtilRow[]>([]);
  const [allocations,  setAllocations]  = useState<PpmAllocation[]>([]);
  const [projects,     setProjects]     = useState<PpmProject[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState("");
  const [activeTab,    setActiveTab]    = useState<"utilization"|"allocations">("utilization");

  const [form, setForm] = useState({
    project_id:     "",
    user_id:        "miguel",
    role:           "Team Member",
    allocation_pct: "50",
    hours_per_week: "20",
    start_date:     new Date().toISOString().slice(0, 10),
    end_date:       "",
    billable_rate:  "",
    cost_rate:      "",
    is_billable:    true,
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, aRes, pRes] = await Promise.all([
        fetch("/api/ppm/resources?mode=utilization"),
        fetch("/api/ppm/resources"),
        fetch("/api/ppm/projects"),
      ]);
      const [uJson, aJson, pJson] = await Promise.all([uRes.json(), aRes.json(), pRes.json()]);
      if (uJson.success) setUtilization(uJson.data);
      if (aJson.success) setAllocations(aJson.data);
      if (pJson.success) {
        const projs: PpmProject[] = pJson.data.projects ?? [];
        setProjects(projs);
        setForm(f => ({ ...f, project_id: f.project_id || (projs[0]?.project_id ?? "") }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function submitAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id) { setFormError("Selecione o projeto"); return; }
    if (!form.allocation_pct || parseFloat(form.allocation_pct) <= 0) { setFormError("Informe o percentual de alocação"); return; }
    setSaving(true); setFormError("");
    try {
      const res  = await fetch("/api/ppm/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          allocation_pct: parseFloat(form.allocation_pct),
          hours_per_week: form.hours_per_week ? parseFloat(form.hours_per_week) : undefined,
          billable_rate:  form.billable_rate  ? parseFloat(form.billable_rate)  : undefined,
          cost_rate:      form.cost_rate      ? parseFloat(form.cost_rate)      : undefined,
          end_date:       form.end_date || undefined,
          status:         "active",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setShowForm(false);
      void load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void load(); }, [load]);

  const overallocated = utilization.filter(r => r.utilization_status === "overallocated").length;
  const available     = utilization.filter(r => r.utilization_status === "available").length;
  const avgPct        = utilization.length > 0 ? utilization.reduce((s,r) => s + r.total_allocation_pct, 0) / utilization.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gestão de Recursos</h1>
              <p className="text-xs text-gray-500">Alocação e utilização do time</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={14} /> Nova Alocação
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Pessoas",         value: String(utilization.length),         color: "text-gray-900"    },
            { label: "Superalocados",   value: String(overallocated),              color: overallocated > 0 ? "text-red-600" : "text-gray-900" },
            { label: "Disponíveis",     value: String(available),                  color: "text-emerald-600" },
            { label: "Média Alocação",  value: `${avgPct.toFixed(0)}%`,            color: avgPct > 90 ? "text-amber-600" : "text-gray-900" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Add Allocation Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand-600" />
                <h2 className="text-sm font-bold text-gray-800">Nova Alocação</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={14} />
              </button>
            </div>
            {formError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{formError}</div>}
            <form onSubmit={e => void submitAllocation(e)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Projeto *</label>
                <select value={form.project_id} onChange={set("project_id")} className={INPUT}>
                  <option value="">Selecionar…</option>
                  {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pessoa *</label>
                <select value={form.user_id} onChange={set("user_id")} className={INPUT}>
                  {USERS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role no Projeto</label>
                <input value={form.role} onChange={set("role")} placeholder="Ex.: Director, Consultant" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Alocação % *</label>
                <input type="number" min="1" max="200" value={form.allocation_pct} onChange={set("allocation_pct")} placeholder="50" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Horas/semana</label>
                <input type="number" min="0" value={form.hours_per_week} onChange={set("hours_per_week")} placeholder="20" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Billable?</label>
                <select value={form.is_billable ? "true" : "false"} onChange={e => setForm(f => ({ ...f, is_billable: e.target.value === "true" }))} className={INPUT}>
                  <option value="true">Sim — Billable</option>
                  <option value="false">Não — Non-billable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Início *</label>
                <input type="date" value={form.start_date} onChange={set("start_date")} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Término</label>
                <input type="date" value={form.end_date} onChange={set("end_date")} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Taxa Billable (R$/h)</label>
                <input type="number" min="0" value={form.billable_rate} onChange={set("billable_rate")} placeholder="150" className={INPUT} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60">
                  <Save size={13} /> {saving ? "Salvando…" : "Alocar"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(["utilization","allocations"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab === "utilization" ? "Utilização por Pessoa" : "Todas Alocações"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Carregando dados…</div>
        ) : activeTab === "utilization" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {utilization.map(row => <UtilCard key={row.user_id} row={row} />)}
            {utilization.length === 0 && (
              <div className="col-span-4 text-center py-12 text-sm text-gray-400">Nenhuma alocação ativa.</div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Pessoa","Projeto","Role","Alocação","Horas/sem","Período","Taxa Billable","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allocations.map(a => (
                  <tr key={a.allocation_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.user_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <Link href={`/awq/ppm/${a.project_id}`} className="hover:text-brand-600 hover:underline truncate block">
                        {a.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{a.role}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${a.allocation_pct > 100 ? "bg-red-100 text-red-700" : a.allocation_pct >= 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {a.allocation_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{a.hours_per_week ? `${a.hours_per_week}h` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {a.start_date.slice(0,10)} → {a.end_date ? a.end_date.slice(0,10) : "em aberto"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {a.billable_rate ? `R$${a.billable_rate}/h` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {allocations.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma alocação encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

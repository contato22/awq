"use client";

// ─── /awq/ppm/timesheets — Timesheet Entry & Approval ────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Clock, CheckCircle2, XCircle, Save, X } from "lucide-react";
import { formatDateBR, formatBRL } from "@/lib/utils";
import type { PpmTimeEntry } from "@/lib/ppm-types";

type Status = "draft" | "submitted" | "approved" | "rejected";

const STATUS_BADGE: Record<Status, string> = {
  draft:     "bg-gray-100   text-gray-600",
  submitted: "bg-blue-100   text-blue-700",
  approved:  "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100    text-red-700",
};
const STATUS_LABEL: Record<Status, string> = {
  draft: "Rascunho", submitted: "Enviado", approved: "Aprovado", rejected: "Rejeitado",
};

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

const USERS    = ["miguel","danilo"] as const;
const PROJECTS = [
  { value: "prj-001", label: "XP Investimentos — Campanha Q1" },
  { value: "prj-002", label: "Nubank — Vídeo Institucional"   },
  { value: "prj-003", label: "Carol Bertolini — Social Media" },
  { value: "prj-004", label: "Reabilicor — Consultoria"       },
  { value: "prj-005", label: "Colégio CEM — Produção Anual"   },
];

export default function TimesheetsPage() {
  const [entries,   setEntries]   = useState<PpmTimeEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [filterUser,setFilterUser]= useState("");

  const [form, setForm] = useState({
    user_id:     "miguel",
    project_id:  "prj-001",
    entry_date:  new Date().toISOString().slice(0,10),
    hours:       "",
    is_billable: true,
    description: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterUser) params.set("user_id", filterUser);
      const res  = await fetch(`/api/ppm/time-entries?${params}`);
      const json = await res.json();
      if (json.success) setEntries(json.data);
    } finally {
      setLoading(false);
    }
  }, [filterUser]);

  useEffect(() => { void load(); }, [load]);

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hours || parseFloat(form.hours) <= 0) { setError("Informe as horas trabalhadas"); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/ppm/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hours: parseFloat(form.hours), status: "submitted" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setShowForm(false);
      setForm(f => ({ ...f, hours: "", description: "" }));
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function approve(entry_id: string) {
    await fetch("/api/ppm/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", entry_id, approved_by: "miguel" }),
    });
    void load();
  }

  // Summary
  const totalHours    = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter(e => e.is_billable).reduce((s, e) => s + e.hours, 0);
  const billableAmt   = entries.filter(e => e.is_billable).reduce((s, e) => s + e.hours * (e.billing_rate ?? 0), 0);
  const pending       = entries.filter(e => e.status === "submitted").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Timesheets</h1>
              <p className="text-xs text-gray-500">Apontamento e aprovação de horas</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus size={14} /> Apontar Horas
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Horas",     value: `${totalHours.toFixed(1)}h`,    color: "text-gray-900"    },
            { label: "Billable",        value: `${billableHours.toFixed(1)}h`, color: "text-brand-600"   },
            { label: "Valor Billable",  value: formatBRL(billableAmt),         color: "text-emerald-600" },
            { label: "Aguardando OK",   value: String(pending),                color: pending > 0 ? "text-amber-600" : "text-gray-900" },
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
                <Clock size={16} className="text-brand-600" />
                <h2 className="text-sm font-bold text-gray-800">Novo Apontamento</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={14} />
              </button>
            </div>
            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</div>}
            <form onSubmit={e => void submitEntry(e)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pessoa</label>
                <select value={form.user_id} onChange={set("user_id")} className={INPUT}>
                  {USERS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Projeto</label>
                <select value={form.project_id} onChange={set("project_id")} className={INPUT}>
                  {PROJECTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Data</label>
                <input type="date" value={form.entry_date} onChange={set("entry_date")} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Horas Trabalhadas *</label>
                <input type="number" step="0.5" min="0.5" max="24" value={form.hours} onChange={set("hours")} placeholder="Ex.: 4.5" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Billable?</label>
                <select value={form.is_billable ? "true" : "false"} onChange={e => setForm(f => ({ ...f, is_billable: e.target.value === "true" }))} className={INPUT}>
                  <option value="true">Sim — Billable</option>
                  <option value="false">Não — Non-billable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição</label>
                <input value={form.description} onChange={set("description")} placeholder="O que foi feito?" className={INPUT} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60">
                  <Save size={13} /> {saving ? "Salvando…" : "Enviar"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Todas as pessoas</option>
            {USERS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Data","Pessoa","Projeto","Tarefa","Horas","Billable","Valor","Descrição","Status",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">Carregando…</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum apontamento encontrado.</td></tr>
                ) : entries.map(entry => (
                  <tr key={entry.entry_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDateBR(entry.entry_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{entry.user_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                      <div className="truncate">{entry.project_name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{entry.task_name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">{entry.hours}h</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${entry.is_billable ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                        {entry.is_billable ? "✓ Billable" : "Non-bill"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {entry.is_billable && entry.billing_rate ? formatBRL(entry.hours * entry.billing_rate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                      <div className="truncate">{entry.description ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[entry.status as Status]}`}>
                        {STATUS_LABEL[entry.status as Status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === "submitted" && (
                        <button onClick={() => void approve(entry.entry_id)}
                          className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          <CheckCircle2 size={12} /> Aprovar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { Activity, Phone, Mail, Users, CheckCircle2, FileText, Plus, Clock, Pencil, X } from "lucide-react";
import type { CrmActivity } from "@/lib/crm-types";
import { SEED_ACTIVITIES } from "@/lib/crm-db";
import { formatDateBR } from "@/lib/utils";

// ─── Edit Activity Modal ──────────────────────────────────────────────────────

function EditActivityModal({
  activity,
  onSave,
  onClose,
}: {
  activity: CrmActivity;
  onSave: (updated: CrmActivity) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    subject:          activity.subject,
    description:      activity.description ?? "",
    outcome:          activity.outcome ?? "",
    duration_minutes: String(activity.duration_minutes ?? ""),
    scheduled_at:     activity.scheduled_at ? activity.scheduled_at.slice(0,16) : "",
    status:           activity.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.subject.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:           "update",
          activity_id:      activity.activity_id,
          subject:          form.subject.trim(),
          description:      form.description || null,
          outcome:          form.outcome     || null,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
          scheduled_at:     form.scheduled_at || null,
          status:           form.status,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      onSave(json.success ? json.data : {
        ...activity,
        subject:          form.subject.trim(),
        description:      form.description || null,
        outcome:          form.outcome     as CrmActivity["outcome"] || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        scheduled_at:     form.scheduled_at || null,
        status:           form.status as CrmActivity["status"],
      });
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Editar Atividade</h2>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assunto *</label>
            <input value={form.subject} onChange={e => set("subject", e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="scheduled">Agendada</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Resultado</label>
              <select value={form.outcome} onChange={e => set("outcome", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="">— Sem resultado —</option>
                <option value="successful">Sucesso</option>
                <option value="unsuccessful">Sem sucesso</option>
                <option value="no_answer">Sem resposta</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Agendamento</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => set("scheduled_at", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duração (min)</label>
              <input type="number" min="0" value={form.duration_minutes} onChange={e => set("duration_minutes", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmtDatetime(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }) + " " +
    dt.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
}

const TYPE_CONFIG: Record<string, { icon: ReactNode; label: string; bg: string }> = {
  call:    { icon: <Phone    size={14} />, label: "Ligação",  bg: "bg-emerald-100 text-emerald-600" },
  email:   { icon: <Mail     size={14} />, label: "E-mail",   bg: "bg-blue-100 text-blue-600" },
  meeting: { icon: <Users    size={14} />, label: "Reunião",  bg: "bg-violet-100 text-violet-600" },
  task:    { icon: <CheckCircle2 size={14}/>, label: "Tarefa", bg: "bg-amber-100 text-amber-600" },
  note:    { icon: <FileText size={14} />, label: "Nota",     bg: "bg-gray-100 text-gray-600" },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled:  "bg-blue-50 text-blue-700",
  completed:  "bg-emerald-50 text-emerald-700",
  cancelled:  "bg-gray-100 text-gray-500",
};

// Group activities by date
function groupByDate(acts: CrmActivity[]) {
  const groups: Record<string, CrmActivity[]> = {};
  for (const a of acts) {
    const key = (a.completed_at ?? a.scheduled_at ?? a.created_at).slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return Object.entries(groups).sort(([a],[b]) => b.localeCompare(a));
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [completing, setCompleting] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<CrmActivity | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetch("/api/crm/activities")
      .then(r => r.json())
      .then(res => setActivities(res.success ? res.data : SEED_ACTIVITIES))
      .catch(() => setActivities(SEED_ACTIVITIES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activities.filter(a => {
    if (filterType !== "Todos" && a.activity_type !== filterType) return false;
    if (filterStatus !== "Todos" && a.status !== filterStatus) return false;
    return true;
  });

  const grouped = groupByDate(filtered);
  const todayKey = new Date().toISOString().slice(0, 10);
  const tasksScheduled = activities.filter(a => a.status === "scheduled").length;
  const completedToday = activities.filter(a => a.status === "completed" && (a.completed_at ?? "").slice(0,10) === todayKey).length;

  async function completeActivity(id: string) {
    setCompleting(id);
    try {
      await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", activity_id: id }),
      });
      setActivities(prev => prev.map(a => a.activity_id === id ? { ...a, status: "completed", completed_at: new Date().toISOString() } : a));
    } finally { setCompleting(null); }
  }

  return (
    <>
      <Header title="Atividades — CRM AWQ" subtitle="Timeline de interações e tarefas" />
      <div className="page-container">

        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        {editingActivity && (
          <EditActivityModal
            activity={editingActivity}
            onSave={updated => {
              setActivities(prev => prev.map(a => a.activity_id === updated.activity_id ? updated : a));
              setEditingActivity(null);
              showToast("Atividade atualizada", true);
            }}
            onClose={() => setEditingActivity(null)}
          />
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: activities.length, color: "text-gray-700" },
            { label: "Agendadas", value: tasksScheduled, color: "text-blue-600" },
            { label: "Concluídas hoje", value: completedToday, color: "text-emerald-600" },
            { label: "Ligações", value: activities.filter(a=>a.activity_type==="call").length, color: "text-violet-600" },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filters + Add */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["Todos","call","email","meeting","task","note"].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {t === "Todos" ? "Todos" : TYPE_CONFIG[t]?.label ?? t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["Todos","scheduled","completed"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterStatus === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {s === "Todos" ? "Todos" : s === "scheduled" ? "Agendadas" : "Concluídas"}
              </button>
            ))}
          </div>
          <Link href="/crm/activities/add"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors">
            <Plus size={13} /> Registrar Atividade
          </Link>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="card p-8 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState icon={<Activity size={20} className="text-gray-400" />} title="Nenhuma atividade encontrada" description="Registre ligações, reuniões e tarefas aqui." />
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, acts]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${date === todayKey ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                    {date === todayKey ? "Hoje" : formatDateBR(date)}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="space-y-3">
                  {acts.map(a => {
                    const cfg = TYPE_CONFIG[a.activity_type] ?? TYPE_CONFIG.note;
                    return (
                      <div key={a.activity_id} className="card p-4 flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{a.subject}</p>
                              {a.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? ""}`}>
                                {a.status === "scheduled" ? "Agendada" : a.status === "completed" ? "Concluída" : "Cancelada"}
                              </span>
                              {a.status === "scheduled" && (
                                <button onClick={() => completeActivity(a.activity_id)} disabled={completing === a.activity_id}
                                  className="text-[11px] text-emerald-600 font-medium hover:underline disabled:opacity-50">
                                  {completing === a.activity_id ? "…" : "Concluir"}
                                </button>
                              )}
                              <button onClick={() => setEditingActivity(a)}
                                className="p-1 rounded-md hover:bg-gray-100 transition-colors" title="Editar atividade">
                                <Pencil size={12} className="text-gray-400 hover:text-brand-600" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Clock size={10} />
                              {a.scheduled_at ? fmtDatetime(a.scheduled_at) : formatDateBR(a.created_at)}
                            </span>
                            <span className="text-[10px] text-gray-400">{a.created_by}</span>
                            {a.outcome && (
                              <span className={`text-[10px] font-medium ${a.outcome === "successful" ? "text-emerald-600" : "text-red-500"}`}>
                                {a.outcome === "successful" ? "✓ Sucesso" : a.outcome === "no_answer" ? "Sem resposta" : "Sem sucesso"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}

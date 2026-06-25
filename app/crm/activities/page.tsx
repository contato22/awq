"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Activity, Phone, Mail, Users, CheckCircle2, FileText, Plus, Clock } from "lucide-react";
import type { CrmActivity } from "@/lib/crm-types";
import { formatDateBR } from "@/lib/utils";

function fmtDatetime(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }) + " " +
    dt.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
}

const TYPE_CONFIG: Record<string, { icon: ReactNode; label: string; bg: string }> = {
  call:    { icon: <Phone    size={14} />, label: "Ligação",  bg: "bg-emerald-100 text-emerald-600" },
  email:   { icon: <Mail     size={14} />, label: "E-mail",   bg: "bg-blue-100 text-blue-600" },
  meeting: { icon: <Users    size={14} />, label: "Reunião",  bg: "bg-brand-100 text-brand-600" },
  task:    { icon: <CheckCircle2 size={14}/>, label: "Tarefa", bg: "bg-amber-100 text-amber-600" },
  note:    { icon: <FileText size={14} />, label: "Nota",     bg: "bg-gray-100 text-gray-600" },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled:  "bg-blue-50 text-blue-700",
  completed:  "bg-emerald-50 text-emerald-700",
  cancelled:  "bg-gray-100 text-gray-500",
};

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

  useEffect(() => {
    fetch("/api/crm/activities")
      .then(r => r.json())
      .then(json => { if (json.data) setActivities(json.data as CrmActivity[]); })
      .catch(() => undefined)
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
    const completedAt = new Date().toISOString();
    setActivities(prev => prev.map(a => a.activity_id === id ? { ...a, status: "completed" as const, completed_at: completedAt } : a));
    await fetch("/api/crm/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", activity_id: id, status: "completed", completed_at: completedAt }),
    }).catch(() => undefined);
    setCompleting(null);
  }

  return (
    <>
      <Header title="Atividades — CRM AWQ" subtitle="Timeline de interações e tarefas" />
      <div className="page-container">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: activities.length, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Agendadas", value: tasksScheduled, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Concluídas hoje", value: completedToday, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Ligações", value: activities.filter(a=>a.activity_type==="call").length, icon: Phone, color: "text-brand-600", bg: "bg-brand-50" },
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon size={16} className={k.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{k.value}</div>
                <div className="text-xs text-gray-500">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

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
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? ""}`}>
                                {a.status === "scheduled" ? "Agendada" : a.status === "completed" ? "Concluída" : "Cancelada"}
                              </span>
                              {a.status === "scheduled" && (
                                <button onClick={() => completeActivity(a.activity_id)} disabled={completing === a.activity_id}
                                  className="text-xs text-emerald-600 font-medium hover:underline disabled:opacity-50">
                                  {completing === a.activity_id ? "…" : "Concluir"}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={10} />
                              {a.scheduled_at ? fmtDatetime(a.scheduled_at) : formatDateBR(a.created_at)}
                            </span>
                            <span className="text-xs text-gray-400">{a.created_by}</span>
                            {a.outcome && (
                              <span className={`text-xs font-medium ${a.outcome === "successful" ? "text-emerald-600" : "text-red-500"}`}>
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

"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { Activity, Phone, Mail, Users, CheckCircle2, FileText, Plus, Clock } from "lucide-react";
import type { CrmActivity } from "@/lib/crm-types";
import { SEED_ACTIVITIES } from "@/lib/crm-db";
import { formatDateBR } from "@/lib/utils";

const ACTS_LS_KEY = "crm-activities-v1";

function persistActivities(data: CrmActivity[]) {
  try { localStorage.setItem(ACTS_LS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function periodRange(period: string): [string, string] | null {
  if (period === "Todos") return null;
  const today = new Date().toISOString().slice(0, 10);
  if (period === "Hoje") return [today, today];
  if (period === "Semana") {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return [d.toISOString().slice(0, 10), today];
  }
  if (period === "Mês") return [today.slice(0, 7) + "-01", today];
  if (period === "Ano") return [today.slice(0, 4) + "-01-01", today];
  return null;
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

function groupByDate(acts: CrmActivity[]) {
  const groups: Record<string, CrmActivity[]> = {};
  for (const a of acts) {
    const key = (a.completed_at ?? a.scheduled_at ?? a.created_at).slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return Object.entries(groups).sort(([a],[b]) => b.localeCompare(a));
}

const PERIOD_OPTIONS = ["Todos", "Hoje", "Semana", "Mês", "Ano"] as const;

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterPeriod, setFilterPeriod] = useState<typeof PERIOD_OPTIONS[number]>("Todos");
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTS_LS_KEY);
      if (stored) {
        setActivities(JSON.parse(stored));
        setLoading(false);
        return;
      }
    } catch { /* ignore */ }

    fetch("/api/crm/activities")
      .then(r => r.json())
      .then(res => {
        const data: CrmActivity[] = res.success ? res.data : SEED_ACTIVITIES;
        persistActivities(data);
        setActivities(data);
      })
      .catch(() => {
        persistActivities(SEED_ACTIVITIES);
        setActivities(SEED_ACTIVITIES);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = activities.filter(a => {
    if (filterType !== "Todos" && a.activity_type !== filterType) return false;
    if (filterStatus !== "Todos" && a.status !== filterStatus) return false;
    const range = periodRange(filterPeriod);
    if (range) {
      const dateKey = (a.completed_at ?? a.scheduled_at ?? a.created_at).slice(0, 10);
      if (dateKey < range[0] || dateKey > range[1]) return false;
    }
    return true;
  });

  const grouped = groupByDate(filtered);
  const todayKey = new Date().toISOString().slice(0, 10);
  const tasksScheduled = activities.filter(a => a.status === "scheduled").length;
  const completedToday = activities.filter(a => a.status === "completed" && (a.completed_at ?? "").slice(0,10) === todayKey).length;

  async function completeActivity(id: string) {
    setCompleting(id);
    const now = new Date().toISOString();
    try {
      await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", activity_id: id }),
      });
    } catch { /* ignore — update local state regardless */ }
    setActivities(prev => {
      const next = prev.map(a =>
        a.activity_id === id ? { ...a, status: "completed" as const, completed_at: now } : a
      );
      persistActivities(next);
      return next;
    });
    setCompleting(null);
  }

  return (
    <>
      <Header title="Atividades — CRM AWQ" subtitle="Timeline de interações e tarefas" />
      <div className="page-container">

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
          {/* Period */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {PERIOD_OPTIONS.map(p => (
              <button key={p} onClick={() => setFilterPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterPeriod === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {p}
              </button>
            ))}
          </div>
          {/* Type */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["Todos","call","email","meeting","task","note"].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {t === "Todos" ? "Todos" : TYPE_CONFIG[t]?.label ?? t}
              </button>
            ))}
          </div>
          {/* Status */}
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

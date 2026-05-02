"use client";

// ─── /awq/bpm/tasks — My Tasks (Work Queue) ──────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock, AlertTriangle, CheckCircle2, ClipboardList, Bell,
  ArrowRight, RefreshCw, Filter,
} from "lucide-react";
import type { WorkQueueItem, WorkQueueStats } from "@/lib/bpm-types";
import { formatBRL } from "@/lib/utils";

const USER_NAMES: Record<string, string> = {
  "1": "Alex Whitmore", "2": "Sam Chen", "3": "Priya Nair", "4": "Danilo", "5": "Miguel",
};

type Filter = "all" | "overdue" | "today" | "upcoming";

// In a real app this comes from session; hardcode Miguel (owner) as demo default
const CURRENT_USER_ID = "5";

export default function BpmTasksPage() {
  const [tasks, setTasks]       = useState<WorkQueueItem[]>([]);
  const [stats, setStats]       = useState<WorkQueueStats>({ total: 0, overdue: 0, due_today: 0, due_this_week: 0 });
  const [filter, setFilter]     = useState<Filter>("all");
  const [loading, setLoading]   = useState(true);
  const [unread, setUnread]     = useState(0);

  const loadTasks = useCallback(async (f: Filter = "all") => {
    setLoading(true);
    try {
      const [tasksRes, notifRes] = await Promise.all([
        fetch(`/api/bpm/my-tasks?user_id=${CURRENT_USER_ID}&filter=${f}`),
        fetch(`/api/bpm/mark-notification-read?user_id=${CURRENT_USER_ID}`),
      ]);
      const tasksJson = await tasksRes.json();
      const notifJson = await notifRes.json();
      if (tasksJson.success) { setTasks(tasksJson.data); setStats(tasksJson.stats); }
      if (notifJson.success) setUnread(notifJson.data?.unread_count ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(filter); }, [filter, loadTasks]);

  const overdue  = tasks.filter((t) => t.sla_breached);
  const today    = tasks.filter((t) => !t.sla_breached && t.sla_due_date && new Date(t.sla_due_date) <= new Date(Date.now() + 24 * 3600_000));
  const upcoming = tasks.filter((t) => !t.sla_breached && (!t.sla_due_date || new Date(t.sla_due_date) > new Date(Date.now() + 24 * 3600_000)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Minhas Tarefas — BPM</h1>
            <p className="text-sm text-gray-500">Aprovações e tarefas pendentes de workflow</p>
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium">
                <Bell className="h-3.5 w-3.5" /> {unread} não lidas
              </span>
            )}
            <button
              onClick={() => loadTasks(filter)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Pendentes" value={stats.total}      color="text-gray-800" icon={<ClipboardList className="h-5 w-5 text-gray-400" />} />
          <StatCard label="SLA Vencido"     value={stats.overdue}    color="text-red-600"  icon={<AlertTriangle  className="h-5 w-5 text-red-400"  />} />
          <StatCard label="Vence Hoje"      value={stats.due_today}  color="text-orange-600" icon={<Clock className="h-5 w-5 text-orange-400" />} />
          <StatCard label="Notif. Não Lidas" value={unread}          color="text-blue-600" icon={<Bell className="h-5 w-5 text-blue-400" />} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "overdue", "today", "upcoming"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {{ all: "Todas", overdue: "SLA Vencido", today: "Hoje", upcoming: "Próximas" }[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            Carregando tarefas...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nenhuma tarefa pendente</p>
            <p className="text-gray-400 text-sm mt-1">Você está em dia com todas as aprovações!</p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && <TaskSection title="⚠ SLA Vencido" tasks={overdue} badge="bg-red-100 text-red-800" />}
            {today.length > 0   && <TaskSection title="📅 Vence Hoje / 24h" tasks={today} badge="bg-orange-100 text-orange-800" />}
            {upcoming.length > 0 && <TaskSection title="📋 Próximas Aprovações" tasks={upcoming} badge="bg-blue-100 text-blue-800" />}
          </>
        )}

        {/* Quick nav */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink href="/awq/bpm/instances" label="Instâncias Ativas" desc="Todos os processos em andamento" />
          <QuickLink href="/awq/bpm/processes" label="Catálogo de Processos" desc="6 workflows configurados" />
          <QuickLink href="/awq/bpm/analytics/performance" label="Process Analytics" desc="Cycle time · SLA · Bottlenecks" />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      {icon}
      <div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function TaskSection({ title, tasks, badge }: { title: string; tasks: WorkQueueItem[]; badge: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>{tasks.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Processo", "Step", "Detalhes", "Iniciado por", "SLA", "Prioridade", ""].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tasks.map((t) => (
              <tr key={t.task_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 text-sm">{t.process_name}</div>
                  <div className="text-xs text-gray-400">{t.instance_code}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.step_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                  {renderDetails(t.request_data)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {USER_NAMES[t.initiated_by] ?? t.initiated_by}
                </td>
                <td className="px-4 py-3">{renderSla(t.sla_hours_remaining, t.sla_breached)}</td>
                <td className="px-4 py-3">{renderPriority(t.priority)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/awq/bpm/tasks/${t.task_id}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Revisar <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderDetails(d: Record<string, unknown>) {
  if (d.supplier_name) {
    const amt = d.amount ? formatBRL(Number(d.amount)) : "";
    return `${d.supplier_name} · ${amt}`;
  }
  if (d.description)   return String(d.description);
  if (d.contract_name) return String(d.contract_name);
  if (d.project_name)  return String(d.project_name);
  return "—";
}

function renderSla(hours: number | null, breached: boolean) {
  if (breached)      return <span className="text-red-600 font-semibold text-xs">⚠ Vencido</span>;
  if (hours === null) return <span className="text-gray-400 text-xs">—</span>;
  if (hours <= 0)    return <span className="text-red-600 font-semibold text-xs">⚠ Vencido</span>;
  if (hours < 24)    return <span className="text-orange-600 font-semibold text-xs">{Math.round(hours)}h</span>;
  return <span className="text-blue-600 text-xs">{Math.round(hours / 24)}d restantes</span>;
}

function renderPriority(p: string) {
  const map: Record<string, string> = {
    urgent: "bg-red-100 text-red-800", high: "bg-orange-100 text-orange-800",
    normal: "bg-blue-100 text-blue-800", low: "bg-gray-100 text-gray-600",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[p] ?? map.normal}`}>{p}</span>;
}

function QuickLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group block">
      <div className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{desc}</div>
    </Link>
  );
}

"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle2, Circle, PlayCircle, XCircle, AlertTriangle } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { ppmFetch } from "@/lib/ppm-fetch";
import type { PpmTask } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

const COLUMNS: { status: TaskStatus; label: string; color: string; icon: React.ElementType }[] = [
  { status: "not_started", label: "A Fazer",      color: "bg-gray-100  border-gray-200",   icon: Circle       },
  { status: "in_progress", label: "Em Andamento", color: "bg-blue-50   border-blue-200",   icon: PlayCircle   },
  { status: "blocked",     label: "Bloqueado",    color: "bg-red-50    border-red-200",    icon: AlertTriangle},
  { status: "completed",   label: "Concluído",    color: "bg-emerald-50 border-emerald-200",icon: CheckCircle2 },
];

const ICON_COLOR: Record<TaskStatus, string> = {
  not_started: "text-gray-400",
  in_progress: "text-blue-500",
  blocked:     "text-red-500",
  completed:   "text-emerald-500",
  cancelled:   "text-gray-300",
};

function TaskCard({ task, onUpdate }: { task: PpmTask; onUpdate: () => void }) {
  async function moveTo(status: TaskStatus) {
    try {
      await ppmFetch("/api/ppm/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.task_id, status }),
      });
    } catch { /* ignore mutation errors silently */ }
    onUpdate();
  }

  const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0,10) && task.status !== "completed";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs font-semibold text-gray-900 leading-snug flex-1">{task.task_name}</div>
        {task.wbs_code && <span className="text-[10px] font-mono text-gray-400 shrink-0">{task.wbs_code}</span>}
      </div>
      {task.project_name && (
        <div className="text-[10px] text-brand-600 font-medium mb-2 truncate">{task.project_name}</div>
      )}
      {task.assigned_name && (
        <div className="text-[10px] text-gray-500 mb-2">👤 {task.assigned_name}</div>
      )}
      {task.due_date && (
        <div className={`text-[10px] mb-2 ${overdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
          📅 {overdue ? "Atrasado · " : ""}{formatDateBR(task.due_date)}
        </div>
      )}
      {task.estimated_hours && (
        <div className="text-[10px] text-gray-400 mb-3">⏱ {task.estimated_hours}h est. · {task.actual_hours}h real</div>
      )}
      {task.completion_pct > 0 && task.completion_pct < 100 && (
        <div className="mb-2">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${task.completion_pct}%` }} />
          </div>
        </div>
      )}
      <div className="flex gap-1 flex-wrap">
        {COLUMNS.filter(c => c.status !== task.status).slice(0,2).map(c => (
          <button key={c.status} onClick={() => void moveTo(c.status)}
            className="text-[9px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks,   setTasks]   = useState<PpmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("project_id", projectFilter);
      const json = await ppmFetch(`/api/ppm/tasks?${params}`) as { success: boolean; data: PpmTask[] };
      if (json.success) setTasks(json.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => { void load(); }, [load]);

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  // Unique projects for filter
  const projects = [...new Map(tasks.map(t => [t.project_id, t.project_name])).entries()];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tarefas — Kanban</h1>
              <p className="text-xs text-gray-500">{tasks.length} tarefas no total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Todos Projetos</option>
              {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            Erro ao carregar tarefas: {error}
          </div>
        )}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Carregando tarefas…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colTasks = byStatus(col.status);
              const Icon = col.icon;
              return (
                <div key={col.status} className={`rounded-xl border p-4 ${col.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={14} className={ICON_COLOR[col.status]} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="ml-auto text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-200">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map(t => <TaskCard key={t.task_id} task={t} onUpdate={() => void load()} />)}
                    {colTasks.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
                        Nenhuma tarefa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

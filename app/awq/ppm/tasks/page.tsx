"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, CheckCircle2, Circle, PlayCircle, AlertTriangle,
  User, Calendar, Clock, Flag, Star, Layers,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmTask } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

const COLUMNS: { status: TaskStatus; label: string; color: string; icon: React.ElementType }[] = [
  { status: "not_started", label: "A Fazer",      color: "bg-gray-100  border-gray-200",    icon: Circle        },
  { status: "in_progress", label: "Em Andamento", color: "bg-blue-50   border-blue-200",    icon: PlayCircle    },
  { status: "blocked",     label: "Bloqueado",    color: "bg-red-50    border-red-200",     icon: AlertTriangle },
  { status: "completed",   label: "Concluído",    color: "bg-emerald-50 border-emerald-200", icon: CheckCircle2  },
];

const ICON_COLOR: Record<TaskStatus, string> = {
  not_started: "text-gray-400",
  in_progress: "text-blue-500",
  blocked:     "text-red-500",
  completed:   "text-emerald-500",
  cancelled:   "text-gray-300",
};

const TYPE_LABEL: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  milestone: { label: "Marco",   icon: Star,   color: "text-amber-500"  },
  phase:     { label: "Fase",    icon: Layers, color: "text-violet-500" },
  task:      { label: "Tarefa",  icon: Circle, color: "text-gray-400"   },
};

function TaskCard({ task, onUpdate }: { task: PpmTask; onUpdate: () => void }) {
  const [moving, setMoving] = useState(false);

  async function moveTo(status: TaskStatus) {
    setMoving(true);
    try {
      await fetch("/api/ppm/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.task_id, status }),
      });
      onUpdate();
    } finally {
      setMoving(false);
    }
  }

  const overdue = task.due_date &&
    task.due_date < new Date().toISOString().slice(0, 10) &&
    task.status !== "completed";

  const typeInfo = TYPE_LABEL[task.task_type] ?? TYPE_LABEL.task;
  const TypeIcon = typeInfo.icon;

  const targets = COLUMNS.filter(c => c.status !== task.status);

  return (
    <div className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow ${moving ? "opacity-60 pointer-events-none" : ""} ${task.status === "blocked" ? "border-red-200" : "border-gray-200"}`}>
      {/* Header row: type badge + name + WBS */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <TypeIcon size={12} className={`${typeInfo.color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-900 leading-snug">{task.task_name}</div>
        </div>
        {task.wbs_code && (
          <span className="text-[10px] font-mono text-gray-400 shrink-0">{task.wbs_code}</span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {task.is_deliverable && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
            <Flag size={8} />
            Entregável
          </span>
        )}
        {task.task_type !== "task" && (
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${task.task_type === "milestone" ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-violet-50 border-violet-200 text-violet-600"}`}>
            {typeInfo.label}
          </span>
        )}
      </div>

      {/* Project name */}
      {task.project_name && (
        <div className="text-[10px] text-brand-600 font-medium mb-1.5 truncate">{task.project_name}</div>
      )}

      {/* Assignee */}
      {task.assigned_name && (
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1.5">
          <User size={9} className="shrink-0" />
          {task.assigned_name}
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div className={`flex items-center gap-1 text-[10px] mb-1.5 ${overdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
          <Calendar size={9} className="shrink-0" />
          {overdue ? "Atrasado · " : ""}{formatDateBR(task.due_date)}
        </div>
      )}

      {/* Hours */}
      {task.estimated_hours ? (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
          <Clock size={9} className="shrink-0" />
          {task.estimated_hours}h est.{task.actual_hours > 0 ? ` · ${task.actual_hours}h real` : ""}
        </div>
      ) : null}

      {/* Blocked reason */}
      {task.status === "blocked" && task.blocked_reason && (
        <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 mb-2 leading-snug">
          {task.blocked_reason}
        </div>
      )}

      {/* Progress bar */}
      {task.completion_pct > 0 && task.completion_pct < 100 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-gray-400">{task.completion_pct}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${task.completion_pct}%` }} />
          </div>
        </div>
      )}

      {/* Move buttons — show all valid targets */}
      {!moving && (
        <div className="flex gap-1 flex-wrap mt-1">
          {targets.map(c => (
            <button
              key={c.status}
              onClick={() => void moveTo(c.status)}
              className="text-[9px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              → {c.label}
            </button>
          ))}
        </div>
      )}
      {moving && (
        <div className="text-[9px] text-gray-400 mt-1">Movendo…</div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [tasks,         setTasks]         = useState<PpmTask[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("");

  // Keep the full project list stable after the first successful load so the
  // dropdown doesn't collapse when a project filter is active.
  const [allProjects, setAllProjects] = useState<[string, string][]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("project_id", projectFilter);
      const res  = await fetch(`/api/ppm/tasks?${params}`);
      const json = await res.json() as { success: boolean; data?: PpmTask[]; error?: string };
      if (json.success && json.data) {
        setTasks(json.data);
        // Populate stable project list only when showing all projects
        if (!projectFilter) {
          const map = new Map<string, string>();
          for (const t of json.data) {
            if (t.project_id && t.project_name) map.set(t.project_id, t.project_name);
          }
          setAllProjects([...map.entries()]);
        }
      } else {
        setError(json.error ?? "Erro ao carregar tarefas.");
      }
    } catch {
      setError("Falha de conexão com a API.");
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => { void load(); }, [load]);

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/awq/ppm"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tarefas — Kanban</h1>
              <p className="text-xs text-gray-500">{tasks.length} tarefas no total</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Todos os Projetos</option>
              {allProjects.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>

            <Link
              href="/awq/ppm/tasks/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Plus size={14} />
              Nova Tarefa
            </Link>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <div key={col.status} className={`rounded-xl border p-4 ${col.color} animate-pulse`}>
                <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-xl p-3 mb-2 border border-gray-100">
                    <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle size={32} className="text-red-400" />
            <p className="text-sm font-semibold text-gray-700">{error}</p>
            <button
              onClick={() => void load()}
              className="text-sm text-brand-600 hover:underline font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colTasks = byStatus(col.status);
              const Icon     = col.icon;
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
                    {colTasks.map(t => (
                      <TaskCard key={t.task_id} task={t} onUpdate={() => void load()} />
                    ))}
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

"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback, DragEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, PlayCircle, AlertTriangle, GripVertical } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmTask } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

const COLUMNS: { status: TaskStatus; label: string; bg: string; border: string; icon: React.ElementType; iconColor: string }[] = [
  { status: "not_started", label: "A Fazer",      bg: "bg-gray-50",      border: "border-gray-200",   icon: Circle,        iconColor: "text-gray-400"    },
  { status: "in_progress", label: "Em Andamento", bg: "bg-blue-50",      border: "border-blue-200",   icon: PlayCircle,    iconColor: "text-blue-500"    },
  { status: "blocked",     label: "Bloqueado",    bg: "bg-red-50",       border: "border-red-200",    icon: AlertTriangle, iconColor: "text-red-500"     },
  { status: "completed",   label: "Concluído",    bg: "bg-emerald-50",   border: "border-emerald-200",icon: CheckCircle2,  iconColor: "text-emerald-500" },
];

const STATUS_BADGE: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress:  "bg-blue-100 text-blue-700",
  blocked:      "bg-red-100 text-red-700",
  completed:    "bg-emerald-100 text-emerald-700",
  cancelled:    "bg-gray-100 text-gray-400",
};

function TaskCard({
  task,
  onDragStart,
  onMove,
}: {
  task: PpmTask;
  onDragStart: (e: DragEvent, id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  const overdue =
    task.due_date &&
    task.due_date < new Date().toISOString().slice(0, 10) &&
    task.status !== "completed";

  const others = COLUMNS.filter((c) => c.status !== task.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.task_id)}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
    >
      {/* Header */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <GripVertical size={12} className="text-gray-300 mt-0.5 shrink-0 group-hover:text-gray-400 transition-colors" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-900 leading-snug">{task.task_name}</div>
          {task.wbs_code && (
            <span className="text-[10px] font-mono text-gray-400">{task.wbs_code}</span>
          )}
        </div>
      </div>

      {task.project_name && (
        <div className="text-[10px] text-brand-600 font-medium mb-1.5 truncate pl-5">{task.project_name}</div>
      )}

      <div className="pl-5 space-y-1 mb-2">
        {task.assigned_name && (
          <div className="text-[10px] text-gray-500">👤 {task.assigned_name}</div>
        )}
        {task.due_date && (
          <div className={`text-[10px] font-medium ${overdue ? "text-red-500" : "text-gray-400"}`}>
            📅 {overdue ? "Atrasado · " : ""}{formatDateBR(task.due_date)}
          </div>
        )}
        {task.estimated_hours ? (
          <div className="text-[10px] text-gray-400">⏱ {task.estimated_hours}h est. · {task.actual_hours ?? 0}h real</div>
        ) : null}
      </div>

      {task.completion_pct > 0 && task.completion_pct < 100 && (
        <div className="mb-2 pl-5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${task.completion_pct}%` }} />
            </div>
            <span className="text-[9px] text-gray-400 shrink-0">{task.completion_pct}%</span>
          </div>
        </div>
      )}

      {/* Quick move buttons — all target statuses */}
      <div className="flex gap-1 flex-wrap pl-5">
        {others.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.status}
              onClick={() => onMove(task.task_id, c.status)}
              title={`Mover para ${c.label}`}
              className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-colors
                ${STATUS_BADGE[c.status]} border-current/20 hover:opacity-80`}
            >
              <Icon size={9} />
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<PpmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("project_id", projectFilter);
      const res = await fetch(`/api/ppm/tasks?${params}`);
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => { void load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function moveTask(taskId: string, toStatus: TaskStatus) {
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task || task.status === toStatus) return;

    const colLabel = COLUMNS.find((c) => c.status === toStatus)?.label ?? toStatus;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.task_id === taskId
          ? { ...t, status: toStatus, completion_pct: toStatus === "completed" ? 100 : t.completion_pct }
          : t
      )
    );
    showToast(`Movido para "${colLabel}"`);

    // Persist
    fetch("/api/ppm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, status: toStatus }),
    }).catch(() => {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.task_id === taskId ? { ...t, status: task.status } : t))
      );
      showToast("Erro ao salvar — alteração revertida");
    });
  }

  function handleDragStart(e: DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(taskId);
  }

  function handleDragOver(e: DragEvent, status: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function handleDrop(e: DragEvent, toStatus: TaskStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    setDraggingId(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) moveTask(taskId, toStatus);
  }

  function handleDragEnd() {
    setDragOverStatus(null);
    setDraggingId(null);
  }

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);
  const projects = [...new Map(tasks.map((t) => [t.project_id, t.project_name])).entries()];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/awq/ppm"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tarefas — Kanban</h1>
              <p className="text-xs text-gray-500">{tasks.length} tarefas · arraste ou clique para mover</p>
            </div>
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Todos os Projetos</option>
            {projects.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Carregando tarefas…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = byStatus(col.status);
              const Icon = col.icon;
              const isOver = dragOverStatus === col.status;
              const draggingTask = tasks.find((t) => t.task_id === draggingId);
              const canDrop = draggingTask && draggingTask.status !== col.status;

              return (
                <div
                  key={col.status}
                  onDragOver={(e) => handleDragOver(e, col.status)}
                  onDragLeave={() => setDragOverStatus(null)}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`rounded-xl border-2 p-4 transition-all ${col.bg}
                    ${isOver && canDrop
                      ? `${col.border} ring-2 ring-inset ring-current scale-[1.01]`
                      : `${col.border}`
                    }`}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={14} className={col.iconColor} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="ml-auto text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-200">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Drop hint */}
                  {isOver && canDrop && (
                    <div className={`mb-2 rounded-lg border-2 border-dashed ${col.border} py-3 text-center text-[10px] font-semibold ${col.iconColor} opacity-70`}>
                      Soltar aqui
                    </div>
                  )}

                  {/* Cards */}
                  <div className="space-y-2">
                    {colTasks.map((t) => (
                      <TaskCard
                        key={t.task_id}
                        task={t}
                        onDragStart={handleDragStart}
                        onMove={moveTask}
                      />
                    ))}
                    {colTasks.length === 0 && !isOver && (
                      <div className="text-xs text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-lg">
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg animate-fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

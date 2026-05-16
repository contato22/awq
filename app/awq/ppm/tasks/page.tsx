"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback, type ElementType } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, CheckCircle2, Circle, PlayCircle,
  AlertTriangle, User2, Calendar, Clock, Package, ClipboardList,
  ChevronRight, AlertCircle,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmTask } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: {
  status: TaskStatus;
  label: string;
  bg: string;
  border: string;
  headerBg: string;
  icon: ElementType;
  iconColor: string;
  countBg: string;
}[] = [
  {
    status:    "not_started",
    label:     "A Fazer",
    bg:        "bg-gray-50",
    border:    "border-gray-200",
    headerBg:  "bg-gray-100",
    icon:      Circle,
    iconColor: "text-gray-400",
    countBg:   "bg-gray-200 text-gray-600",
  },
  {
    status:    "in_progress",
    label:     "Em Andamento",
    bg:        "bg-blue-50",
    border:    "border-blue-200",
    headerBg:  "bg-blue-100",
    icon:      PlayCircle,
    iconColor: "text-blue-500",
    countBg:   "bg-blue-200 text-blue-700",
  },
  {
    status:    "blocked",
    label:     "Bloqueado",
    bg:        "bg-red-50",
    border:    "border-red-200",
    headerBg:  "bg-red-100",
    icon:      AlertTriangle,
    iconColor: "text-red-500",
    countBg:   "bg-red-200 text-red-700",
  },
  {
    status:    "completed",
    label:     "Concluído",
    bg:        "bg-emerald-50",
    border:    "border-emerald-200",
    headerBg:  "bg-emerald-100",
    icon:      CheckCircle2,
    iconColor: "text-emerald-500",
    countBg:   "bg-emerald-200 text-emerald-700",
  },
];

const MOVE_CHIP: Record<TaskStatus, { label: string; cls: string }> = {
  not_started: { label: "A Fazer",      cls: "border-gray-300 text-gray-600 hover:bg-gray-100" },
  in_progress:  { label: "Em Andamento", cls: "border-blue-300 text-blue-600 hover:bg-blue-50" },
  blocked:      { label: "Bloqueado",    cls: "border-red-300 text-red-600 hover:bg-red-50" },
  completed:    { label: "Concluído",    cls: "border-emerald-300 text-emerald-600 hover:bg-emerald-50" },
  cancelled:    { label: "Cancelado",    cls: "border-gray-200 text-gray-400 hover:bg-gray-50" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-lime-100 text-lime-700",
  "bg-sky-100 text-sky-700",
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm animate-pulse">
      <div className="h-3 bg-gray-200 rounded-full w-3/4 mb-2" />
      <div className="h-2 bg-gray-100 rounded-full w-1/2 mb-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="h-5 w-5 bg-gray-100 rounded-full" />
        <div className="h-2 bg-gray-100 rounded-full w-1/3" />
      </div>
      <div className="h-1 bg-gray-100 rounded-full mb-3" />
      <div className="flex gap-1">
        <div className="h-5 bg-gray-100 rounded w-16" />
        <div className="h-5 bg-gray-100 rounded w-20" />
      </div>
    </div>
  );
}

function SkeletonColumn({ count }: { count: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-3 bg-gray-200 rounded-full w-20 animate-pulse" />
        <div className="ml-auto h-5 w-6 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

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

  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.due_date && task.due_date < today && task.status !== "completed";
  const pct = task.completion_pct ?? 0;

  const moveTargets = COLUMNS.filter(c => c.status !== task.status);

  return (
    <div
      className={`bg-white border rounded-xl p-3 shadow-sm transition-all duration-150
        ${moving ? "opacity-50 pointer-events-none" : "hover:shadow-md"}
        ${overdue ? "border-red-200" : "border-gray-200"}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-semibold text-gray-900 leading-snug flex-1">{task.task_name}</p>
        <div className="flex items-center gap-1 shrink-0">
          {task.is_deliverable && (
            <span title="Entregável" className="inline-flex items-center justify-center w-4 h-4 rounded bg-violet-100">
              <Package size={9} className="text-violet-600" />
            </span>
          )}
          {task.wbs_code && (
            <span className="text-[10px] font-mono text-gray-400">{task.wbs_code}</span>
          )}
        </div>
      </div>

      {/* Project */}
      {task.project_name && (
        <p className="text-[10px] text-brand-600 font-medium mb-2 truncate">{task.project_name}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-col gap-1 mb-2">
        {/* Assignee */}
        {task.assigned_name && (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0 ${avatarColor(task.assigned_name)}`}>
              {initials(task.assigned_name)}
            </span>
            <span className="text-[10px] text-gray-600 truncate">{task.assigned_name}</span>
          </div>
        )}

        {/* Due date */}
        {task.due_date && (
          <div className="flex items-center gap-1.5">
            <Calendar size={10} className={overdue ? "text-red-400" : "text-gray-300"} />
            {overdue ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600">
                <AlertCircle size={9} />
                Atrasado · {formatDateBR(task.due_date)}
              </span>
            ) : (
              <span className="text-[10px] text-gray-500">{formatDateBR(task.due_date)}</span>
            )}
          </div>
        )}

        {/* Hours */}
        {task.estimated_hours && (
          <div className="flex items-center gap-1.5">
            <Clock size={10} className="text-gray-300" />
            <span className="text-[10px] text-gray-500">
              {task.actual_hours}h / {task.estimated_hours}h est.
            </span>
          </div>
        )}
      </div>

      {/* Blocked reason */}
      {task.status === "blocked" && task.blocked_reason && (
        <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 mb-2 leading-relaxed">
          {task.blocked_reason}
        </p>
      )}

      {/* Progress bar */}
      {pct > 0 && pct < 100 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-gray-400">Progresso</span>
            <span className="text-[9px] font-semibold text-brand-600">{pct}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Move buttons */}
      <div className="flex gap-1 flex-wrap pt-1 border-t border-gray-100">
        {moveTargets.map(col => {
          const chip = MOVE_CHIP[col.status];
          return (
            <button
              key={col.status}
              onClick={() => void moveTo(col.status)}
              className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${chip.cls}`}
            >
              <ChevronRight size={9} />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,         setTasks]         = useState<PpmTask[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [projectFilter, setProjectFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("project_id", projectFilter);
      const res  = await fetch(`/api/ppm/tasks?${params}`);
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => { void load(); }, [load]);

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = tasks.filter(
    t => t.due_date && t.due_date < today && t.status !== "completed"
  ).length;

  // Unique projects for filter
  const projects = [...new Map(tasks.map(t => [t.project_id, t.project_name])).entries()];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/awq/ppm"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Tarefas — Kanban</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500">{tasks.length} tarefas no total</span>
                {!loading && overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                    <AlertCircle size={9} />
                    {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Todos os Projetos</option>
              {projects.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>

            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
              title="Nova Tarefa (em breve)"
            >
              <Plus size={14} />
              Nova Tarefa
            </button>
          </div>
        </div>
      </div>

      {/* ── Board ───────────────────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonColumn count={3} />
            <SkeletonColumn count={2} />
            <SkeletonColumn count={1} />
            <SkeletonColumn count={4} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colTasks = byStatus(col.status);
              const colOverdue = colTasks.filter(
                t => t.due_date && t.due_date < today
              ).length;
              const Icon = col.icon;

              return (
                <div
                  key={col.status}
                  className={`rounded-xl border ${col.border} ${col.bg} flex flex-col`}
                >
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl ${col.headerBg} border-b ${col.border}`}>
                    <Icon size={14} className={col.iconColor} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {colOverdue > 0 && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded-full px-1.5 py-0.5 leading-none">
                          {colOverdue} ⚠
                        </span>
                      )}
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 leading-none ${col.countBg}`}>
                        {colTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-3 space-y-2 flex-1">
                    {colTasks.map(t => (
                      <TaskCard key={t.task_id} task={t} onUpdate={() => void load()} />
                    ))}

                    {colTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed border-gray-200 rounded-xl">
                        <ClipboardList size={20} className="text-gray-300" />
                        <p className="text-xs text-gray-400 text-center">Nenhuma tarefa</p>
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

"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback, type ElementType } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, CheckCircle2, Circle, PlayCircle,
  AlertTriangle, Calendar, Clock, Package, ClipboardList,
  ChevronRight, AlertCircle, Flag, Layers,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmTask } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: {
  status:    TaskStatus;
  label:     string;
  bg:        string;
  border:    string;
  headerBg:  string;
  icon:      ElementType;
  iconColor: string;
  countBg:   string;
}[] = [
  {
    status:   "not_started",
    label:    "A Fazer",
    bg:       "bg-gray-50",
    border:   "border-gray-200",
    headerBg: "bg-white",
    icon:     Circle,
    iconColor:"text-gray-400",
    countBg:  "bg-gray-100 text-gray-500",
  },
  {
    status:   "in_progress",
    label:    "Em Andamento",
    bg:       "bg-blue-50/60",
    border:   "border-blue-200",
    headerBg: "bg-blue-50",
    icon:     PlayCircle,
    iconColor:"text-blue-500",
    countBg:  "bg-blue-100 text-blue-700",
  },
  {
    status:   "blocked",
    label:    "Bloqueado",
    bg:       "bg-red-50/60",
    border:   "border-red-200",
    headerBg: "bg-red-50",
    icon:     AlertTriangle,
    iconColor:"text-red-500",
    countBg:  "bg-red-100 text-red-700",
  },
  {
    status:   "completed",
    label:    "Concluído",
    bg:       "bg-emerald-50/60",
    border:   "border-emerald-200",
    headerBg: "bg-emerald-50",
    icon:     CheckCircle2,
    iconColor:"text-emerald-500",
    countBg:  "bg-emerald-100 text-emerald-700",
  },
];

const MOVE_CHIP: Record<TaskStatus, { label: string; cls: string }> = {
  not_started: { label: "A Fazer",      cls: "border-gray-300   text-gray-600   hover:bg-gray-100" },
  in_progress:  { label: "Em Andamento", cls: "border-blue-300   text-blue-600   hover:bg-blue-50"  },
  blocked:      { label: "Bloqueado",    cls: "border-red-300    text-red-600    hover:bg-red-50"   },
  completed:    { label: "Concluído",    cls: "border-emerald-300 text-emerald-600 hover:bg-emerald-50" },
  cancelled:    { label: "Cancelado",    cls: "border-gray-200   text-gray-400   hover:bg-gray-50"  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-cyan-100   text-cyan-700",
  "bg-amber-100  text-amber-700",
  "bg-pink-100   text-pink-700",
  "bg-lime-100   text-lime-700",
  "bg-sky-100    text-sky-700",
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm animate-pulse space-y-2">
      <div className="h-3 bg-gray-200 rounded-full w-3/4" />
      <div className="h-2 bg-gray-100 rounded-full w-1/2" />
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-100 rounded-full shrink-0" />
        <div className="h-2 bg-gray-100 rounded-full w-1/3" />
      </div>
      <div className="h-1 bg-gray-100 rounded-full" />
    </div>
  );
}

function SkeletonColumn({ col, count }: { col: typeof COLUMNS[number]; count: number }) {
  const Icon = col.icon;
  return (
    <div className={`rounded-xl border ${col.border} flex flex-col overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 ${col.headerBg} border-b ${col.border} shrink-0`}>
        <Icon size={14} className={`${col.iconColor} opacity-40`} />
        <span className="text-sm font-semibold text-gray-400">{col.label}</span>
        <div className="ml-auto h-5 w-6 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="p-3 space-y-2 flex-1">
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

  const today    = new Date().toISOString().slice(0, 10);
  const overdue  = task.due_date && task.due_date < today && task.status !== "completed";
  const done     = task.status === "completed";
  const pct      = task.completion_pct ?? 0;
  const moveTargets = COLUMNS.filter(c => c.status !== task.status);

  return (
    <div
      className={[
        "group bg-white border rounded-xl shadow-sm transition-all duration-150",
        moving        ? "opacity-50 pointer-events-none scale-95" : "hover:shadow-md",
        overdue       ? "border-red-200" : "border-gray-200",
        done          ? "opacity-70"     : "",
      ].join(" ")}
    >
      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`text-xs font-semibold leading-snug flex-1 ${done ? "line-through text-gray-400" : "text-gray-900"}`}>
            {task.task_name}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {/* Task type badge */}
            {task.task_type === "milestone" && (
              <span title="Marco" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                <Flag size={8} />
                Marco
              </span>
            )}
            {task.task_type === "phase" && (
              <span title="Fase" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                <Layers size={8} />
                Fase
              </span>
            )}
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
          <p className="text-[11px] text-brand-600 font-medium mb-2 truncate">{task.project_name}</p>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-1 mb-2">
          {task.assigned_name && (
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold shrink-0 ${avatarColor(task.assigned_name)}`}>
                {initials(task.assigned_name)}
              </span>
              <span className="text-[11px] text-gray-600 truncate">{task.assigned_name}</span>
            </div>
          )}

          {task.due_date && (
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className={overdue ? "text-red-400" : "text-gray-300"} />
              {overdue ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600">
                  <AlertCircle size={10} />
                  Atrasado · {formatDateBR(task.due_date)}
                </span>
              ) : (
                <span className="text-[11px] text-gray-500">{formatDateBR(task.due_date)}</span>
              )}
            </div>
          )}

          {task.estimated_hours && (
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-gray-300" />
              <span className="text-[11px] text-gray-500">
                {task.actual_hours}h <span className="text-gray-400">/ {task.estimated_hours}h est.</span>
              </span>
            </div>
          )}
        </div>

        {/* Blocked reason */}
        {task.status === "blocked" && task.blocked_reason && (
          <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-2 leading-relaxed">
            {task.blocked_reason}
          </p>
        )}

        {/* Progress bar */}
        {pct > 0 && pct < 100 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Progresso</span>
              <span className="text-[10px] font-semibold text-brand-600">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Move buttons — hidden by default, shown on hover (always visible on touch) */}
      <div className={[
        "border-t border-gray-100 px-3 py-2 flex gap-1 flex-wrap",
        "transition-all duration-150",
        "sm:max-h-0 sm:py-0 sm:overflow-hidden sm:opacity-0",
        "sm:group-hover:max-h-16 sm:group-hover:py-2 sm:group-hover:opacity-100",
      ].join(" ")}>
        {moveTargets.map(col => {
          const chip = MOVE_CHIP[col.status];
          return (
            <button
              key={col.status}
              onClick={() => void moveTo(col.status)}
              className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${chip.cls}`}
            >
              <ChevronRight size={10} />
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

  const today        = new Date().toISOString().slice(0, 10);
  const overdueCount = tasks.filter(t => t.due_date && t.due_date < today && t.status !== "completed").length;
  const projects     = [...new Map(tasks.map(t => [t.project_id, t.project_name])).entries()];

  return (
    // Full-viewport layout on desktop — true Kanban feel
    <div className="bg-gray-50 min-h-screen lg:h-screen lg:flex lg:flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">

          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/awq/ppm"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Tarefas — Kanban</h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-xs text-gray-400">{tasks.length} tarefas</span>
                {!loading && overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                    <AlertCircle size={10} />
                    {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: filter + add */}
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

            {/* Disabled until feature is built */}
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg opacity-40 cursor-not-allowed select-none"
              title="Em breve"
            >
              <Plus size={14} />
              Nova Tarefa
            </button>
          </div>
        </div>
      </header>

      {/* ── Board ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            {COLUMNS.map((col, i) => (
              <SkeletonColumn key={col.status} col={col} count={[3, 2, 1, 4][i]} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:h-full">
            {COLUMNS.map(col => {
              const colTasks  = byStatus(col.status);
              const colOverdue = colTasks.filter(t => t.due_date && t.due_date < today).length;
              const Icon       = col.icon;

              return (
                <div
                  key={col.status}
                  className={`rounded-xl border ${col.border} ${col.bg} flex flex-col lg:overflow-hidden`}
                >
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-4 py-3 ${col.headerBg} border-b ${col.border} rounded-t-xl shrink-0`}>
                    <Icon size={14} className={col.iconColor} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {colOverdue > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded-full px-1.5 py-0.5 leading-none">
                          <AlertTriangle size={9} className="shrink-0" />
                          {colOverdue}
                        </span>
                      )}
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 leading-none ${col.countBg}`}>
                        {colTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable cards */}
                  <div className="p-3 space-y-2 flex-1 lg:overflow-y-auto lg:overscroll-contain">
                    {colTasks.map(t => (
                      <TaskCard key={t.task_id} task={t} onUpdate={() => void load()} />
                    ))}

                    {colTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-gray-200 rounded-xl">
                        <ClipboardList size={22} className="text-gray-300" />
                        <p className="text-xs text-gray-400">Nenhuma tarefa</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

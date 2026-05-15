"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import type { DragEvent, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Circle, PlayCircle,
  AlertTriangle, X, Save, Pencil,
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function TaskEditModal({
  task,
  onSave,
  onClose,
}: {
  task: PpmTask;
  onSave: (updated: Partial<PpmTask>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    task_name:       task.task_name,
    status:          task.status as TaskStatus,
    completion_pct:  task.completion_pct,
    due_date:        task.due_date ?? "",
    assigned_name:   task.assigned_name ?? "",
    estimated_hours: task.estimated_hours ?? "",
    blocked_reason:  task.blocked_reason ?? "",
    notes:           task.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      task_name:       form.task_name,
      status:          form.status,
      completion_pct:  Number(form.completion_pct),
      due_date:        form.due_date || undefined,
      assigned_name:   form.assigned_name || undefined,
      estimated_hours: form.estimated_hours !== "" ? Number(form.estimated_hours) : undefined,
      blocked_reason:  form.blocked_reason || undefined,
      notes:           form.notes || undefined,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 truncate pr-4">{task.task_name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="task-edit-form" onSubmit={e => void handleSubmit(e)} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da tarefa</label>
            <input
              value={form.task_name}
              onChange={e => setForm(f => ({ ...f, task_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Conclusão (%)</label>
              <input
                type="number" min={0} max={100}
                value={form.completion_pct}
                onChange={e => setForm(f => ({ ...f, completion_pct: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data limite</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Horas estimadas</label>
              <input
                type="number" min={0} step={0.5}
                value={form.estimated_hours}
                onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Responsável</label>
            <input
              value={form.assigned_name}
              onChange={e => setForm(f => ({ ...f, assigned_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Nome do responsável"
            />
          </div>

          {form.status === "blocked" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo do bloqueio</label>
              <input
                value={form.blocked_reason}
                onChange={e => setForm(f => ({ ...f, blocked_reason: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="Descreva o bloqueio"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
              placeholder="Observações adicionais"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="task-edit-form"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onDragStart,
}: {
  task: PpmTask;
  onEdit: (task: PpmTask) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, taskId: string) => void;
}) {
  const overdue = task.due_date &&
    task.due_date < new Date().toISOString().slice(0, 10) &&
    task.status !== "completed";

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.task_id)}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs font-semibold text-gray-900 leading-snug flex-1">{task.task_name}</div>
        <div className="flex items-center gap-1 shrink-0">
          {task.wbs_code && <span className="text-[10px] font-mono text-gray-400">{task.wbs_code}</span>}
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded text-gray-300 hover:text-brand-600 hover:bg-brand-50 transition-colors opacity-0 group-hover:opacity-100"
            title="Editar tarefa"
          >
            <Pencil size={11} />
          </button>
        </div>
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
          <div className="text-[9px] text-gray-400 mt-0.5 text-right">{task.completion_pct}%</div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,         setTasks]         = useState<PpmTask[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [projectFilter, setProjectFilter] = useState("");
  const [editTask,      setEditTask]      = useState<PpmTask | null>(null);
  const [dragOver,      setDragOver]      = useState<TaskStatus | null>(null);
  const dragTaskId = useRef<string | null>(null);

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
  const projects = [...new Map(tasks.map(t => [t.project_id, t.project_name])).entries()];

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(e: DragEvent<HTMLDivElement>, taskId: string) {
    dragTaskId.current = taskId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, status: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(status);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    // Only clear when leaving the column entirely (not moving to a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, status: TaskStatus) {
    e.preventDefault();
    setDragOver(null);
    const taskId = dragTaskId.current;
    if (!taskId) return;
    dragTaskId.current = null;
    const task = tasks.find(t => t.task_id === taskId);
    if (!task || task.status === status) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status } : t));

    await fetch("/api/ppm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, status }),
    });
    void load();
  }

  // ── Edit save ──────────────────────────────────────────────────────────────

  async function handleSave(patch: Partial<PpmTask>) {
    if (!editTask) return;
    await fetch("/api/ppm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: editTask.task_id, ...patch }),
    });
    setEditTask(null);
    void load();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      {/* Board */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Carregando tarefas…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colTasks = byStatus(col.status);
              const Icon = col.icon;
              const isOver = dragOver === col.status;
              return (
                <div
                  key={col.status}
                  onDragOver={e => handleDragOver(e, col.status)}
                  onDragLeave={e => handleDragLeave(e)}
                  onDrop={e => void handleDrop(e, col.status)}
                  className={`rounded-xl border p-4 transition-colors ${col.color} ${
                    isOver ? "ring-2 ring-brand-400 ring-offset-1 bg-brand-50/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={14} className={ICON_COLOR[col.status]} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="ml-auto text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-200">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {colTasks.map(t => (
                      <TaskCard
                        key={t.task_id}
                        task={t}
                        onEdit={setEditTask}
                        onDragStart={handleDragStart}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className={`text-xs text-center py-6 border border-dashed rounded-lg transition-colors ${
                        isOver
                          ? "border-brand-400 text-brand-500 bg-brand-50/50"
                          : "border-gray-200 text-gray-400"
                      }`}>
                        {isOver ? "Solte aqui" : "Nenhuma tarefa"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editTask && (
        <TaskEditModal
          task={editTask}
          onSave={handleSave}
          onClose={() => setEditTask(null)}
        />
      )}
    </div>
  );
}

"use client";

// ─── /awq/ppm/tasks — Tasks Kanban ───────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle2, Circle, PlayCircle, XCircle, AlertTriangle, X, Save } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import type { PpmTask, PpmProject } from "@/lib/ppm-types";

type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";

const COLUMNS: { status: TaskStatus; label: string; color: string; icon: React.ElementType }[] = [
  { status: "not_started", label: "A Fazer",      color: "bg-gray-100  border-gray-200",    icon: Circle        },
  { status: "in_progress", label: "Em Andamento", color: "bg-blue-50   border-blue-200",    icon: PlayCircle    },
  { status: "blocked",     label: "Bloqueado",    color: "bg-red-50    border-red-200",     icon: AlertTriangle },
  { status: "completed",   label: "Concluído",    color: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
];

const ICON_COLOR: Record<TaskStatus, string> = {
  not_started: "text-gray-400",
  in_progress: "text-blue-500",
  blocked:     "text-red-500",
  completed:   "text-emerald-500",
  cancelled:   "text-gray-300",
};

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onUpdate }: { task: PpmTask; onUpdate: () => void }) {
  async function moveTo(status: TaskStatus) {
    await fetch("/api/ppm/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: task.task_id, status }),
    });
    onUpdate();
  }

  const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== "completed";

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
      {task.estimated_hours != null && (
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
        {COLUMNS.filter(c => c.status !== task.status).slice(0, 2).map(c => (
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

// ─── Add Task Modal ───────────────────────────────────────────────────────────

function AddTaskModal({
  projects,
  defaultProjectId,
  onClose,
  onSaved,
}: {
  projects: PpmProject[];
  defaultProjectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_id:      defaultProjectId || (projects[0]?.project_id ?? ""),
    task_name:       "",
    assigned_name:   "",
    estimated_hours: "",
    start_date:      "",
    due_date:        "",
    priority:        "medium",
    status:          "not_started" as TaskStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id) { setError("Selecione o projeto"); return; }
    if (!form.task_name.trim()) { setError("Informe o nome da tarefa"); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/ppm/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : undefined,
          start_date:      form.start_date || undefined,
          due_date:        form.due_date   || undefined,
          task_type:       "task",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Nova Tarefa</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>
        {error && (
          <div className="mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</div>
        )}
        <form onSubmit={e => void submit(e)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Projeto *</label>
            <select value={form.project_id} onChange={set("project_id")} className={INPUT}>
              <option value="">Selecionar…</option>
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome da Tarefa *</label>
            <input
              value={form.task_name} onChange={set("task_name")}
              placeholder="Ex.: Criar briefing de campanha"
              className={INPUT}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Responsável</label>
              <input value={form.assigned_name} onChange={set("assigned_name")} placeholder="Nome" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Horas Estimadas</label>
              <input type="number" step="0.5" min="0.5" value={form.estimated_hours} onChange={set("estimated_hours")} placeholder="Ex.: 8" className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Início</label>
              <input type="date" value={form.start_date} onChange={set("start_date")} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prazo</label>
              <input type="date" value={form.due_date} onChange={set("due_date")} className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prioridade</label>
              <select value={form.priority} onChange={set("priority")} className={INPUT}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status Inicial</label>
              <select value={form.status} onChange={set("status")} className={INPUT}>
                <option value="not_started">A Fazer</option>
                <option value="in_progress">Em Andamento</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 shadow-sm"
            >
              <Save size={13} /> {saving ? "Criando…" : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,     setTasks]     = useState<PpmTask[]>([]);
  const [projects,  setProjects]  = useState<PpmProject[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [projectFilter, setProjectFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("project_id", projectFilter);
      const [tasksRes, projRes] = await Promise.all([
        fetch(`/api/ppm/tasks?${params}`),
        fetch("/api/ppm/projects"),
      ]);
      const [tasksJson, projJson] = await Promise.all([tasksRes.json(), projRes.json()]);
      if (tasksJson.success) setTasks(tasksJson.data);
      if (projJson.success)  setProjects(projJson.data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => { void load(); }, [load]);

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  return (
    <div className="min-h-screen bg-gray-50">
      {showAdd && (
        <AddTaskModal
          projects={projects}
          defaultProjectId={projectFilter}
          onClose={() => setShowAdd(false)}
          onSaved={() => void load()}
        />
      )}

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
            <select
              value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Todos Projetos</option>
              {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
            </select>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={14} /> Nova Tarefa
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
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
                  {col.status === "not_started" && (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-gray-400 hover:text-brand-600 py-2 rounded-lg border border-dashed border-gray-200 hover:border-brand-300 transition-colors"
                    >
                      <Plus size={12} /> Adicionar tarefa
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

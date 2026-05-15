"use client";

// ─── /awq/ppm/tasks/new — Nova Tarefa ────────────────────────────────────────

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import type { PpmProject } from "@/lib/ppm-types";

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

export default function NewTaskPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<PpmProject[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const [form, setForm] = useState({
    project_id:      "",
    task_name:       "",
    task_type:       "task" as "task" | "milestone" | "phase",
    status:          "not_started" as string,
    assigned_name:   "",
    estimated_hours: "",
    start_date:      "",
    due_date:        "",
    description:     "",
    is_deliverable:  false,
  });

  useEffect(() => {
    fetch("/api/ppm/projects")
      .then(r => r.json())
      .then(j => { if (j.success) setProjects(j.data?.projects ?? j.data ?? []); })
      .catch(() => {});
  }, []);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id) { setError("Selecione um projeto."); return; }
    if (!form.task_name.trim()) { setError("Nome da tarefa é obrigatório."); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ppm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : undefined,
          sort_order: 0,
          completion_pct: 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/awq/ppm/tasks");
      } else {
        setError(json.error ?? "Erro ao criar tarefa.");
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/awq/ppm/tasks" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Nova Tarefa</h1>
            <p className="text-xs text-gray-500">Preencha os dados da nova tarefa</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <form onSubmit={e => void submit(e)} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Identificação</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Projeto <span className="text-red-500">*</span></label>
              <select value={form.project_id} onChange={set("project_id")} className={INPUT} required>
                <option value="">Selecione o projeto…</option>
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nome da Tarefa <span className="text-red-500">*</span></label>
              <input type="text" value={form.task_name} onChange={set("task_name")} className={INPUT}
                placeholder="Ex.: Desenvolvimento de roteiro" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
                <select value={form.task_type} onChange={set("task_type")} className={INPUT}>
                  <option value="task">Tarefa</option>
                  <option value="phase">Fase</option>
                  <option value="milestone">Marco</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={set("status")} className={INPUT}>
                  <option value="not_started">A Fazer</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="blocked">Bloqueado</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_deliverable" checked={form.is_deliverable}
                onChange={e => setForm(f => ({ ...f, is_deliverable: e.target.checked }))}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500/30" />
              <label htmlFor="is_deliverable" className="text-sm text-gray-700">É um entregável</label>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cronograma & Responsável</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Início</label>
                <input type="date" value={form.start_date} onChange={set("start_date")} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Entrega</label>
                <input type="date" value={form.due_date} onChange={set("due_date")} className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Responsável</label>
                <input type="text" value={form.assigned_name} onChange={set("assigned_name")} className={INPUT}
                  placeholder="Nome do responsável" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Horas Estimadas</label>
                <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={set("estimated_hours")} className={INPUT}
                  placeholder="Ex.: 8" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Descrição</h2>
            <textarea value={form.description} onChange={set("description")} rows={3} className={INPUT}
              placeholder="Detalhes sobre o escopo e critérios de aceite…" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/awq/ppm/tasks"
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50">
              <Save size={14} />
              {saving ? "Salvando…" : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

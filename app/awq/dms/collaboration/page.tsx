"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Plus, Trash2 } from "lucide-react";
import type { DmsTask } from "@/lib/dms-db";

const STATUS_BADGE: Record<string, string> = {
  Aberta:     "bg-blue-100 text-blue-700",
  "Em Curso": "bg-amber-100 text-amber-700",
  Concluída:  "bg-emerald-100 text-emerald-700",
  Cancelada:  "bg-gray-100 text-gray-500",
};

const EMPTY = { title: "", document_id: null as string | null, assignee: "", due_date: null as string | null, status: "Aberta" as string, notes: "" };

export default function ColaboraçãoPage() {
  const [data, setData] = useState<DmsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/dms/tasks").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/dms/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, due_date: form.due_date || null, document_id: form.document_id || null }) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/dms/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const abertas = data.filter(d => d.status === "Aberta").length;
  const vencendo = data.filter(d => {
    if (!d.due_date) return false;
    const days = (new Date(d.due_date).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/dms" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Colaboração</h1>
              <p className="text-xs text-gray-500">DMS · Colaboração</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Nova Tarefa
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Tarefas", value: data.length, color: "text-gray-900" },
            { label: "Abertas",       value: abertas,      color: "text-blue-600" },
            { label: "Vencendo (3d)", value: vencendo,     color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Users size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhuma tarefa cadastrada</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Tarefa", "Responsável", "Prazo", "Status", "Notas", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                    <td className="px-4 py-3 text-gray-600">{t.assignee}</td>
                    <td className="px-4 py-3 text-gray-500">{t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{t.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Nova Tarefa</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              {[["Título", "title"], ["Responsável", "assignee"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string ?? ""} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={key === "title"} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prazo</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.due_date ?? ""} onChange={e => setForm(p => ({ ...p, due_date: e.target.value || null }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.keys(STATUS_BADGE).map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

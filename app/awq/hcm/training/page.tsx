"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Plus, Trash2 } from "lucide-react";
import type { HcmTraining } from "@/lib/hcm-db";

const EMPTY = { employee_id: "", course: "", provider: "", status: "Planejado" as string, start_date: null as string | null, end_date: null as string | null, hours: 0 };

export default function TreinamentosPage() {
  const [data, setData] = useState<HcmTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/hcm/training").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/hcm/training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, hours: Number(form.hours), start_date: form.start_date || null, end_date: form.end_date || null }) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/hcm/training", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const badge = (v: string) => {
    const map: Record<string, string> = { Planejado: "bg-blue-100 text-blue-700", "Em Andamento": "bg-yellow-100 text-yellow-700", Concluído: "bg-green-100 text-green-700", Cancelado: "bg-gray-100 text-gray-600" };
    return `inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[v] ?? "bg-gray-100 text-gray-600"}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/hcm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Treinamentos</h1>
              <p className="text-xs text-gray-500">HCM · Treinamentos</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Novo Treinamento
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <BookOpen size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum treinamento cadastrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Curso", "Fornecedor", "Colaborador", "Início", "Horas", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.course}</td>
                    <td className="px-4 py-3 text-gray-600">{t.provider}</td>
                    <td className="px-4 py-3 text-gray-600">{t.employee_id}</td>
                    <td className="px-4 py-3 text-gray-500">{t.start_date ? new Date(t.start_date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{t.hours}h</td>
                    <td className="px-4 py-3"><span className={badge(t.status)}>{t.status}</span></td>
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
              <h2 className="text-base font-semibold text-gray-900">Novo Treinamento</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              {[["Curso", "course", "text"], ["Fornecedor", "provider", "text"], ["ID do Colaborador", "employee_id", "text"], ["Início", "start_date", "date"], ["Fim", "end_date", "date"]].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string ?? ""} onChange={e => setForm(p => ({ ...p, [key]: e.target.value || (["start_date","end_date"].includes(key) ? null : "") }))} required={key === "course"} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Horas</label>
                <input type="number" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {["Planejado", "Em Andamento", "Concluído", "Cancelado"].map(o => <option key={o}>{o}</option>)}
                </select>
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

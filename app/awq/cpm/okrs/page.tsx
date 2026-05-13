"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Target, Plus, Trash2 } from "lucide-react";
import type { CpmOkr } from "@/lib/cpm-db";

const EMPTY = { objective: "", key_result: "", owner: "", quarter: "", status: "Em Andamento" as string, progress: 0 };

export default function OKRsPage() {
  const [data, setData] = useState<CpmOkr[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/cpm/okrs").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/cpm/okrs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, progress: Number(form.progress) }) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/cpm/okrs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const badge = (v: string) => {
    const map: Record<string, string> = { "Em Andamento": "bg-blue-100 text-blue-700", Concluído: "bg-green-100 text-green-700", Atrasado: "bg-red-100 text-red-700", Cancelado: "bg-gray-100 text-gray-600" };
    return `inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[v] ?? "bg-gray-100 text-gray-600"}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/cpm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">OKRs</h1>
              <p className="text-xs text-gray-500">CPM · OKRs</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Novo OKR
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Target size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum OKR cadastrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Objetivo", "Key Result", "Trimestre", "Progresso", "Status", "Responsável", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{o.objective}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{o.key_result}</td>
                    <td className="px-4 py-3 text-gray-600">{o.quarter}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(o.progress ?? 0, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{o.progress ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={badge(o.status)}>{o.status}</span></td>
                    <td className="px-4 py-3 text-gray-600">{o.owner}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onDelete(o.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
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
              <h2 className="text-base font-semibold text-gray-900">Novo OKR</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              {[["Objetivo", "objective"], ["Key Result", "key_result"], ["Trimestre (ex: Q1 2025)", "quarter"], ["Responsável", "owner"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={key === "objective"} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Progresso (%)</label>
                <input type="number" min={0} max={100} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.progress} onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {["Em Andamento", "Concluído", "Atrasado", "Cancelado"].map(o => <option key={o}>{o}</option>)}
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

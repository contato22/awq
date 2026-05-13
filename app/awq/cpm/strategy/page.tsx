"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Target, Plus, Trash2 } from "lucide-react";
import type { CpmStrategy } from "@/lib/cpm-db";

const STATUS_BADGE: Record<string, string> = {
  Ativo:    "bg-emerald-100 text-emerald-700",
  Revisão:  "bg-amber-100 text-amber-700",
  Pausado:  "bg-gray-100 text-gray-500",
  Encerrado:"bg-blue-100 text-blue-700",
};

const PILLARS = ["Crescimento", "Eficiência", "Inovação", "Pessoas", "Sustentabilidade"];

const EMPTY = { title: "", pillar: "Crescimento" as string, owner: "", horizon: "", status: "Ativo" as string, description: "" };

export default function EstratégiaPage() {
  const [data, setData] = useState<CpmStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/cpm/strategies").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/cpm/strategies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/cpm/strategies", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const ativos = data.filter(d => d.status === "Ativo").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/cpm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Estratégia</h1>
              <p className="text-xs text-gray-500">CPM · Estratégia</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Nova Iniciativa
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Iniciativas", value: data.length, color: "text-gray-900" },
            { label: "Ativas",            value: ativos,      color: "text-emerald-600" },
            { label: "Em Revisão",        value: data.filter(d => d.status === "Revisão").length, color: "text-amber-600" },
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
            <Target size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhuma iniciativa estratégica cadastrada</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Iniciativa", "Pilar", "Horizonte", "Responsável", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.title}</div>
                      {s.description && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{s.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.pillar}</td>
                    <td className="px-4 py-3 text-gray-600">{s.horizon}</td>
                    <td className="px-4 py-3 text-gray-600">{s.owner}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[s.status] ?? "bg-gray-100 text-gray-600"}`}>{s.status}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => onDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
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
              <h2 className="text-base font-semibold text-gray-900">Nova Iniciativa Estratégica</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              {[["Título", "title"], ["Horizonte (ex: 2025–2026)", "horizon"], ["Responsável", "owner"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={key === "title"} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pilar</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.pillar} onChange={e => setForm(p => ({ ...p, pillar: e.target.value }))}>
                  {PILLARS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.keys(STATUS_BADGE).map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
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

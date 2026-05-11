"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, LineChart, Plus, Trash2 } from "lucide-react";
import type { BIVisualization } from "@/lib/bi-db";

const CHART_TYPES = ["bar", "line", "pie", "scatter", "area", "funnel"];

const CHART_BADGE: Record<string, string> = {
  bar:     "bg-blue-100 text-blue-700",
  line:    "bg-emerald-100 text-emerald-700",
  pie:     "bg-purple-100 text-purple-700",
  scatter: "bg-amber-100 text-amber-700",
  area:    "bg-teal-100 text-teal-700",
  funnel:  "bg-rose-100 text-rose-700",
};

export default function BiVisualizationsPage() {
  const [items, setItems]   = useState<BIVisualization[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ name: "", description: "", chart_type: "bar", data_source: "" });

  function load() {
    setLoading(true);
    fetch("/api/awq/bi/visualizations")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/awq/bi/visualizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", data: { ...form, config: {} } }),
    });
    setForm({ name: "", description: "", chart_type: "bar", data_source: "" });
    setAdding(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch("/api/awq/bi/visualizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/bi" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <LineChart size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Visualizações</h1>
            <p className="text-xs text-gray-500">BI · Visualizações Configuradas</p>
          </div>
          <button
            onClick={() => setAdding(v => !v)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={13} /> Nova Visualização
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {adding && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Nova Visualização</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <select value={form.chart_type} onChange={e => setForm(f => ({ ...f, chart_type: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300">
                {CHART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Fonte de dados (ex: epm_kpis, financial_db)" value={form.data_source} onChange={e => setForm(f => ({ ...f, data_source: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <input placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors">Salvar</button>
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Visualizações", value: items.length,                                               color: "text-gray-900"    },
            { label: "Tipos de Gráfico",    value: new Set(items.map(i => i.chart_type)).size,                color: "text-brand-700"   },
            { label: "Fontes de Dados",     value: new Set(items.map(i => i.data_source).filter(Boolean)).size, color: "text-emerald-700" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Fonte de Dados</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Criado em</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Carregando…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <LineChart size={28} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm font-medium">Nenhuma visualização ainda</p>
                    <p className="text-xs text-gray-300 mt-1">Clique em "Nova Visualização" para configurar</p>
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CHART_BADGE[item.chart_type] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.chart_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.data_source || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{item.description || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{item.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

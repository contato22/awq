"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import type { BIReport } from "@/lib/bi-db";

const CATEGORY_BADGE: Record<string, string> = {
  "Financeiro":  "bg-emerald-100 text-emerald-700",
  "Operacional": "bg-blue-100 text-blue-700",
  "RH":          "bg-purple-100 text-purple-700",
  "Compliance":  "bg-amber-100 text-amber-700",
  "Geral":       "bg-gray-100 text-gray-600",
};

export default function BiReportsPage() {
  const [items, setItems]   = useState<BIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ title: "", description: "", category: "Geral", created_by: "" });

  function load() {
    setLoading(true);
    fetch("/api/awq/bi/reports")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/awq/bi/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", data: { ...form, query_type: "custom" } }),
    });
    setForm({ title: "", description: "", category: "Geral", created_by: "" });
    setAdding(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch("/api/awq/bi/reports", {
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
          <FileText size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Relatórios</h1>
            <p className="text-xs text-gray-500">BI · Relatórios Salvos</p>
          </div>
          <button
            onClick={() => setAdding(v => !v)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={13} /> Novo Relatório
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {adding && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Novo Relatório</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <input placeholder="Criado por" value={form.created_by} onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <input placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300 sm:col-span-2" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-300">
                {["Financeiro", "Operacional", "RH", "Compliance", "Geral"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors">Salvar</button>
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Relatórios", value: items.length,                                               color: "text-gray-900"  },
            { label: "Categorias",       value: new Set(items.map(i => i.category)).size,                   color: "text-brand-700" },
            { label: "Criadores",        value: new Set(items.map(i => i.created_by).filter(Boolean)).size, color: "text-gray-700"  },
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
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Criado por</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Data</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Carregando…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <FileText size={28} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm font-medium">Nenhum relatório ainda</p>
                    <p className="text-xs text-gray-300 mt-1">Clique em "Novo Relatório" para criar</p>
                  </td>
                </tr>
              ) : items.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[r.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.created_by || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate">{r.description || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(r.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
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

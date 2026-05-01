"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { EpmCostCenter, BuCode } from "@/lib/ap-ar-db";

const BUS: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

export default function CostCentersPage() {
  const [items,     setItems]     = useState<EpmCostCenter[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [filterBU,  setFilterBU]  = useState<BuCode | "">("");
  const [form, setForm] = useState({ code: "", name: "", bu_code: "AWQ" as BuCode, description: "" });

  async function load() {
    setLoading(true);
    const qs = filterBU ? `?bu_code=${filterBU}` : "";
    const res = await fetch(`/api/epm/cost-centers${qs}`);
    const j   = await res.json();
    if (j.success) setItems(j.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterBU]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/epm/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (j.success) {
        setShowForm(false);
        setForm({ code: "", name: "", bu_code: "AWQ", description: "" });
        await load();
      }
    } finally { setSubmitting(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centros de Custo</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastro de centros de custo por BU</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Novo CC"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterBU("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterBU ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Todos
        </button>
        {BUS.map((b) => (
          <button key={b} onClick={() => setFilterBU(b)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterBU === b ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {b}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border-2 border-blue-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Novo Centro de Custo</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
              <input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Ex: CC-JACQES-MKT"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">BU *</label>
              <select value={form.bu_code} onChange={(e) => setForm((f) => ({ ...f, bu_code: e.target.value as BuCode }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {BUS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Marketing — JACQES"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Opcional"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "Salvando..." : "Criar"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhum centro de custo cadastrado.</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">BU</th>
                <th className="px-4 py-3 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cc) => (
                <tr key={cc.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{cc.code}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{cc.name}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cc.bu_code}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{cc.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs mt-4">
        <Link href="/awq/epm/revenue-recognition" className="text-brand-600 hover:underline">← Reconhec. de Receita</Link>
        <span className="text-gray-300">|</span>
        <Link href="/awq/epm" className="text-brand-600 hover:underline">Visão Geral EPM →</Link>
      </div>
    </div>
  );
}

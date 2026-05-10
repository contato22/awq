"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, ArrowLeftRight } from "lucide-react";
import type { InventoryMovement } from "@/lib/erp-db";

const TYPE_BADGE: Record<InventoryMovement["type"], string> = {
  entrada: "bg-emerald-100 text-emerald-700",
  saida:   "bg-red-100 text-red-700",
  ajuste:  "bg-blue-100 text-blue-700",
};

const TYPE_LABEL: Record<InventoryMovement["type"], string> = {
  entrada: "Entrada",
  saida:   "Saída",
  ajuste:  "Ajuste",
};

export default function InventoryMovementsPage() {
  const [search, setSearch]   = useState("");
  const [items, setItems]     = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/erp/inventory")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.movements); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(m => {
    const q = search.toLowerCase();
    return (
      m.item_id.toLowerCase().includes(q) ||
      (m.reason ?? "").toLowerCase().includes(q)
    );
  });

  const entradas = items.filter(m => m.type === "entrada").length;
  const saidas   = items.filter(m => m.type === "saida").length;
  const ajustes  = items.filter(m => m.type === "ajuste").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Movimentações de Estoque</h1>
              <p className="text-xs text-gray-500">ERP · Estoque</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Movimentação
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Movimentações</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : items.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Entradas</div>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "—" : entradas}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Saídas</div>
            <div className="text-2xl font-bold text-red-600">{loading ? "—" : saidas}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ajustes</div>
            <div className="text-2xl font-bold text-blue-600">{loading ? "—" : ajustes}</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item ou motivo…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Data", "Tipo", "Item ID", "Qtd", "Motivo", "BU"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16">
                      <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <ArrowLeftRight size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Nova Movimentação
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{m.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_BADGE[m.type]}`}>
                          {TYPE_LABEL[m.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{m.item_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{m.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.reason}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.bu}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Type legend */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(TYPE_BADGE) as [InventoryMovement["type"], string][]).map(([t, cls]) => (
            <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{TYPE_LABEL[t]}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

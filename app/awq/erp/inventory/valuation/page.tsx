"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, BarChart3, Package, Layers, RefreshCw } from "lucide-react";
import type { InventoryItem } from "@/lib/erp-db";

export default function InventoryValuationPage() {
  const [search, setSearch]   = useState("");
  const [items, setItems]     = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/erp/inventory")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  const totalQty        = items.reduce((s, i) => s + i.qty_stock, 0);
  const uniqueCategories = new Set(items.map(i => i.category)).size;

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
              <h1 className="text-lg font-bold text-gray-900">Avaliação de Estoque</h1>
              <p className="text-xs text-gray-500">ERP · Estoque</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Package size={14} className="text-brand-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Itens</span>
            </div>
            <div className="text-2xl font-bold text-brand-600">{loading ? "—" : items.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Qtd em Estoque</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "—" : totalQty.toLocaleString("pt-BR")}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={14} className="text-amber-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categorias</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{loading ? "—" : uniqueCategories}</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Código", "Descrição", "Categoria", "Unidade", "Qtd Estoque", "Localização", "BU"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16">
                      <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <BarChart3 size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        <p className="text-xs text-gray-400">Cadastre itens no estoque para ver a avaliação</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.qty_stock.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.bu}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

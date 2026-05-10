"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Package } from "lucide-react";
import type { InventoryItem } from "@/lib/erp-db";

export default function InventoryItemsPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/erp/inventory")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = items.filter(x =>
    x.code.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)
  );

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
              <h1 className="text-lg font-bold text-gray-900">Produtos e Itens</h1>
              <p className="text-xs text-gray-500">ERP · Estoque</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Novo Item
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código ou descrição…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Código", "Descrição", "Categoria", "Unidade", "Qtd Estoque", "Localização"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Package size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Novo Item
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{item.qty_stock}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.location}</td>
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

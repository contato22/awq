"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Warehouse } from "lucide-react";
import type { InventoryItem } from "@/lib/erp-db";

interface LocationGroup {
  location: string;
  count: number;
  totalQty: number;
  bus: string[];
}

export default function WarehousesPage() {
  const [items, setItems]     = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/erp/inventory")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups: LocationGroup[] = Object.values(
    items.reduce<Record<string, LocationGroup>>((acc, item) => {
      const loc = item.location ?? "Sem localização";
      if (!acc[loc]) acc[loc] = { location: loc, count: 0, totalQty: 0, bus: [] };
      acc[loc].count++;
      acc[loc].totalQty += item.qty_stock;
      if (!acc[loc].bus.includes(item.bu)) acc[loc].bus.push(item.bu);
      return acc;
    }, {})
  ).sort((a, b) => a.location.localeCompare(b.location));

  const totalItens = items.length;
  const totalQty   = items.reduce((s, i) => s + i.qty_stock, 0);

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
              <h1 className="text-lg font-bold text-gray-900">Armazéns e Localizações</h1>
              <p className="text-xs text-gray-500">ERP · Estoque</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Novo Armazém
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Localizações</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : groups.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Itens</div>
            <div className="text-2xl font-bold text-brand-600">{loading ? "—" : totalItens}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Qtd</div>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "—" : totalQty.toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Localização", "Itens", "Total Qtd", "BU"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16">
                      <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Warehouse size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Novo Armazém
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groups.map(g => (
                    <tr key={g.location} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{g.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{g.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{g.totalQty.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.bus.join(", ")}</td>
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

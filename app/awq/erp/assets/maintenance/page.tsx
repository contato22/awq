"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Wrench } from "lucide-react";
import type { FixedAsset } from "@/lib/erp-db";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AssetMaintenancePage() {
  const [items, setItems] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/erp/assets")
      .then((r) => r.json())
      .then((j) => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const inMaintenance = items.filter((a) => a.status === "Em Manutenção");

  const filtered = inMaintenance.filter((a) => {
    const q = search.toLowerCase();
    return a.code.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
  });

  const totalValue = filtered.reduce((s, a) => s + a.acquisition_value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/erp/assets" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Manutenção de Assets</h1>
              <p className="text-xs text-gray-500">ERP · Ativo Fixo</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Manutenção
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total em Manutenção</div>
            <div className="text-2xl font-bold text-amber-600">{loading ? "—" : filtered.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Total Afetado</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : fmtBRL(totalValue)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar asset ou responsável…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Código", "Ativo", "Categoria", "Localização", "BU", "Data Aquisição", "Valor"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <Wrench size={32} className="text-gray-200" />
                          <p className="text-sm font-medium text-gray-500">Nenhum ativo em manutenção</p>
                          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                            <Plus size={14} /> Nova Manutenção
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">{a.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{a.description}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.category}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.location}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.bu}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.acquisition_date}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap tabular-nums">{fmtBRL(a.acquisition_value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

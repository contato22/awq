"use client";

import Link from "next/link";
import { ArrowLeft, Search, BarChart3, Package, TrendingUp, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function InventoryValuationPage() {
  const [search, setSearch] = useState("");

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Valor Total Estoque",      icon: TrendingUp,  color: "text-emerald-600" },
            { label: "Itens Cadastrados",         icon: Package,     color: "text-brand-600"   },
            { label: "Itens sem Movimentação",    icon: BarChart3,   color: "text-amber-600"   },
            { label: "Último Update",             icon: RefreshCw,   color: "text-gray-600"    },
          ].map(({ label, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${color}`}>—</div>
            </div>
          ))}
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
                  {["Produto", "Unidade", "Qtd", "Custo Médio", "Valor Total"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={5} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <BarChart3 size={32} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      <p className="text-xs text-gray-400">Cadastre itens no estoque para ver a avaliação</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

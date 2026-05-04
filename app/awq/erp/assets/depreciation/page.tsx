"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, TrendingDown } from "lucide-react";

const METODO_BADGE: Record<string, string> = {
  Linear:    "bg-blue-100 text-blue-700",
  Acelerado: "bg-purple-100 text-purple-700",
};

export default function AssetDepreciationPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/assets" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Depreciação de Assets</h1>
            <p className="text-xs text-gray-500">ERP · Ativo Fixo</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Valor Original Total",      color: "text-gray-900"    },
            { label: "Depreciação Acumulada",      color: "text-red-600"     },
            { label: "Valor Líquido Contábil",     color: "text-emerald-600" },
          ].map(({ label, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>—</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar asset…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Asset", "Vida Útil", "Método", "Taxa % a.a.", "Valor Original", "Dep. Acumulada", "Valor Líquido"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={7} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <TrendingDown size={32} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(METODO_BADGE).map(([label, cls]) => (
            <span key={label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Receipt } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  Rascunho:   "bg-gray-100 text-gray-600",
  Submetido:  "bg-blue-100 text-blue-700",
  Aprovado:   "bg-emerald-100 text-emerald-700",
  Rejeitado:  "bg-red-100 text-red-700",
  Pago:       "bg-purple-100 text-purple-700",
};

const CATEGORIA_BADGE: Record<string, string> = {
  Viagem:      "bg-sky-100 text-sky-700",
  Refeição:    "bg-orange-100 text-orange-700",
  Hospedagem:  "bg-indigo-100 text-indigo-700",
  Transporte:  "bg-teal-100 text-teal-700",
  Outros:      "bg-gray-100 text-gray-600",
};

export default function ExpensesPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Relatório de Despesas</h1>
              <p className="text-xs text-gray-500">ERP · Time & Expense</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Despesa
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Submetido",        color: "text-blue-600"    },
            { label: "Total Aprovado",          color: "text-emerald-600" },
            { label: "Aguardando Aprovação",    color: "text-amber-600"   },
            { label: "Total Pago",              color: "text-purple-600"  },
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
            placeholder="Buscar despesa ou colaborador…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Data", "Colaborador", "Categoria", "Descrição", "Valor", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Receipt size={32} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                        <Plus size={14} /> Nova Despesa
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legends */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_BADGE).map(([label, cls]) => (
            <span key={label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
          ))}
          <span className="text-gray-300">|</span>
          {Object.entries(CATEGORIA_BADGE).map(([label, cls]) => (
            <span key={label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

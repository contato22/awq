"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, PackageCheck } from "lucide-react";

type ReceivingStatus = "Pendente" | "Conferido" | "Divergência";

const STATUS_BADGE: Record<ReceivingStatus, string> = {
  Pendente:    "bg-gray-100 text-gray-600",
  Conferido:   "bg-emerald-100 text-emerald-700",
  Divergência: "bg-red-100 text-red-700",
};

export default function ReceivingPage() {
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
              <h1 className="text-lg font-bold text-gray-900">Recebimento de Mercadorias</h1>
              <p className="text-xs text-gray-500">ERP · Procurement</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Novo Recebimento
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
            placeholder="Buscar recebimento ou fornecedor…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Recebimento", "Fornecedor", "Nº Pedido", "Data Recebimento", "Qtd Recebida", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <PackageCheck size={32} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                        <Plus size={14} /> Novo Recebimento
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(STATUS_BADGE) as [ReceivingStatus, string][]).map(([status, cls]) => (
            <span key={status} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{status}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

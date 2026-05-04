"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Package } from "lucide-react";

const PRIORITY_BADGE: Record<string, string> = {
  Normal:  "bg-gray-100 text-gray-600",
  Alta:    "bg-amber-100 text-amber-700",
  Urgente: "bg-red-100 text-red-700",
};

const STATUS_BADGE: Record<string, string> = {
  Aguardando:    "bg-gray-100 text-gray-600",
  "Em Separação": "bg-blue-100 text-blue-700",
  Separado:      "bg-purple-100 text-purple-700",
  Expedido:      "bg-emerald-100 text-emerald-700",
};

export default function FulfillmentPage() {
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
              <h1 className="text-lg font-bold text-gray-900">Fulfillment / Separação</h1>
              <p className="text-xs text-gray-500">ERP · Pedidos</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Separação
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido ou cliente…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Pedido", "Cliente", "Itens", "Prioridade", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={5} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Package size={32} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                        <Plus size={14} /> Nova Separação
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Prioridade</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRIORITY_BADGE).map(([label, cls]) => (
              <span key={label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
            ))}
          </div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase mt-2">Status</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_BADGE).map(([label, cls]) => (
              <span key={label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

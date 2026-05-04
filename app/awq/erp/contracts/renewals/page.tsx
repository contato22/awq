"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, RefreshCw, AlertTriangle } from "lucide-react";

export default function ContractRenewalsPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/contracts" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Renovações de Contratos</h1>
            <p className="text-xs text-gray-500">ERP · Contratos</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* Alert summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Vencendo em < 30 dias", color: "border-red-200 bg-red-50",   textColor: "text-red-600"   },
            { label: "Vencendo em < 60 dias", color: "border-amber-200 bg-amber-50", textColor: "text-amber-600" },
            { label: "Vencendo em < 90 dias", color: "border-blue-200 bg-blue-50",  textColor: "text-blue-600"  },
          ].map(({ label, color, textColor }) => (
            <div key={label} className={`border rounded-xl p-4 shadow-sm ${color}`}>
              <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
              <div className={`text-2xl font-bold ${textColor}`}>0</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contrato ou contraparte…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Contrato", "Contraparte", "Vencimento", "Dias Restantes", "Valor", "Ação"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <AlertTriangle size={32} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum contrato próximo do vencimento</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend: dias restantes color coding */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>&lt; 30 dias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>&lt; 60 dias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>&gt; 60 dias</span>
          </div>
          <span className="ml-2 flex items-center gap-1">
            <RefreshCw size={11} className="text-brand-600" /> Botão "Iniciar Renovação" disponível por linha
          </span>
        </div>
      </div>
    </div>
  );
}

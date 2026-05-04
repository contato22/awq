"use client";

import Link from "next/link";
import { ArrowLeft, FileSignature } from "lucide-react";

const STAGES = [
  { key: "prospeccao",  label: "Prospecção",  color: "bg-gray-100 text-gray-600  border-gray-200" },
  { key: "negociacao",  label: "Negociação",  color: "bg-blue-50  text-blue-700  border-blue-200"  },
  { key: "aprovacao",   label: "Aprovação",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "ativo",       label: "Ativo",       color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "renovacao",   label: "Renovação",   color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "encerrado",   label: "Encerrado",   color: "bg-gray-50  text-gray-500  border-gray-200"  },
];

export default function ContractLifecyclePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/contracts" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ciclo de Vida dos Contratos</h1>
            <p className="text-xs text-gray-500">ERP · Contratos</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Kanban stages */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STAGES.map((stage) => (
            <div key={stage.key} className={`border rounded-xl p-4 text-center ${stage.color}`}>
              <div className="text-xs font-semibold mb-1">{stage.label}</div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-[10px] opacity-70 mt-0.5">contratos</div>
            </div>
          ))}
        </div>

        {/* Arrow flow indicator */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold overflow-x-auto pb-1">
          {STAGES.map((stage, i) => (
            <span key={stage.key} className="flex items-center gap-1 shrink-0">
              <span>{stage.label}</span>
              {i < STAGES.length - 1 && <span className="text-gray-300">→</span>}
            </span>
          ))}
        </div>

        {/* Full contract table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Todos os Contratos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Contrato", "Contraparte", "Objeto", "Estágio Atual", "Valor Total", "Término"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <FileSignature size={28} className="text-gray-200" />
                      <p className="text-sm text-gray-400">Nenhum registro encontrado</p>
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

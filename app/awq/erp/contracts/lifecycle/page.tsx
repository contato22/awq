"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileSignature } from "lucide-react";
import type { ErpContract } from "@/lib/erp-db";

const STAGES = [
  { key: "Rascunho",   label: "Rascunho",   color: "border-gray-200  bg-gray-50   text-gray-600"   },
  { key: "Negociação", label: "Negociação", color: "border-blue-200  bg-blue-50   text-blue-700"   },
  { key: "Aprovação",  label: "Aprovação",  color: "border-amber-200 bg-amber-50  text-amber-700"  },
  { key: "Ativo",      label: "Ativo",      color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "Renovação",  label: "Renovação",  color: "border-purple-200 bg-purple-50 text-purple-700" },
  { key: "Encerrado",  label: "Encerrado",  color: "border-gray-200  bg-gray-50   text-gray-500"   },
];

const STATUS_BADGE: Record<string, string> = {
  Rascunho:   "bg-gray-100 text-gray-600",
  Negociação: "bg-blue-100 text-blue-700",
  Aprovação:  "bg-amber-100 text-amber-700",
  Ativo:      "bg-emerald-100 text-emerald-700",
  Renovação:  "bg-purple-100 text-purple-700",
  Encerrado:  "bg-gray-100 text-gray-500",
};

export default function ContractLifecyclePage() {
  const [data, setData] = useState<ErpContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/erp/contracts").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  const countByStage = (key: string) => data.filter(c => c.status === key).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/contracts" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
          <div><h1 className="text-lg font-bold text-gray-900">Ciclo de Vida dos Contratos</h1><p className="text-xs text-gray-500">ERP · Contratos</p></div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STAGES.map(stage => (
            <div key={stage.key} className={`border rounded-xl p-4 text-center ${stage.color}`}>
              <div className="text-xs font-semibold mb-1">{stage.label}</div>
              <div className="text-2xl font-bold">{loading ? "—" : countByStage(stage.key)}</div>
              <div className="text-[10px] opacity-70 mt-0.5">contratos</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold overflow-x-auto pb-1">
          {STAGES.map((stage, i) => (
            <span key={stage.key} className="flex items-center gap-1 shrink-0">
              <span>{stage.label}</span>
              {i < STAGES.length - 1 && <span className="text-gray-300">→</span>}
            </span>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-700">Todos os Contratos</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50"><tr>{["Nome", "Contraparte", "Tipo", "Status", "Valor", "Vigência"].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                : data.length === 0 ? <tr><td colSpan={6} className="px-4 py-12"><div className="flex flex-col items-center gap-2 text-center"><FileSignature size={28} className="text-gray-200" /><p className="text-sm text-gray-400">Nenhum registro encontrado</p></div></td></tr>
                : data.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.party}</td>
                    <td className="px-4 py-3 text-gray-500">{c.type}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>{c.status}</span></td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(c.value ?? 0)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

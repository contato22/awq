"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import type { VacationRequest, VacationStatus } from "@/lib/hcm-db";

const STATUS_BADGE: Record<VacationStatus, string> = {
  Solicitado: "bg-blue-100 text-blue-700",
  Aprovado:   "bg-emerald-100 text-emerald-700",
  Rejeitado:  "bg-red-100 text-red-700",
  Concluído:  "bg-gray-100 text-gray-600",
};

export default function FériasPage() {
  const [items, setItems] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/hcm/vacation")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const aprovadas = items.filter(i => i.status === "Aprovado").length;
  const pendentes = items.filter(i => i.status === "Solicitado").length;
  const totalDiasAprovados = items
    .filter(i => i.status === "Aprovado")
    .reduce((acc, i) => acc + i.days, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/hcm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Férias</h1>
            <p className="text-xs text-gray-500">HCM · Férias</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Total Solicitações</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Aprovadas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{aprovadas}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Pendentes</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{pendentes}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Total Dias Aprovados</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalDiasAprovados}</p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center py-16">
            <Calendar size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Colaborador</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Início</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fim</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Dias</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">BU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.employee_name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.start_date}</td>
                    <td className="px-4 py-3 text-gray-600">{item.end_date}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{item.days}</td>
                    <td className="px-4 py-3 text-gray-600">{item.bu}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

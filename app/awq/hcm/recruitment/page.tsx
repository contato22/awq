"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import type { JobOpening, RecruitmentStatus } from "@/lib/hcm-db";

const STATUS_BADGE: Record<RecruitmentStatus, string> = {
  "Aberta":      "bg-emerald-100 text-emerald-700",
  "Em Triagem":  "bg-blue-100 text-blue-700",
  "Entrevistas": "bg-purple-100 text-purple-700",
  "Oferta":      "bg-amber-100 text-amber-700",
  "Encerrada":   "bg-gray-100 text-gray-600",
};

export default function RecrutamentoPage() {
  const [items, setItems] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/hcm/recruitment")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const vagasAbertas = items.filter(i => i.status === "Aberta").length;
  const emAndamento = items.filter(i => i.status === "Em Triagem" || i.status === "Entrevistas").length;
  const totalCandidaturas = items.reduce((acc, i) => acc + i.applications, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/hcm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Recrutamento</h1>
            <p className="text-xs text-gray-500">HCM · Recrutamento</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Vagas Abertas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{vagasAbertas}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Em Triagem / Entrevistas</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{emAndamento}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Total Candidaturas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCandidaturas}</p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center py-16">
            <UserPlus size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Vaga</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">BU</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Candidaturas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Abertura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                    <td className="px-4 py-3 text-gray-600">{item.department}</td>
                    <td className="px-4 py-3 text-gray-600">{item.bu}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{item.applications}</td>
                    <td className="px-4 py-3 text-gray-600">{item.open_date}</td>
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

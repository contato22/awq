"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import type { OKR } from "@/lib/cpm-db";

const TYPE_BADGE: Record<string, string> = {
  company:    "bg-purple-100 text-purple-700",
  team:       "bg-blue-100 text-blue-700",
  individual: "bg-gray-100 text-gray-600",
};

const STATUS_BADGE: Record<string, string> = {
  "Não Iniciado": "bg-gray-100 text-gray-600",
  "Em Progresso": "bg-blue-100 text-blue-700",
  "Concluído":    "bg-emerald-100 text-emerald-700",
  "Cancelado":    "bg-red-100 text-red-700",
};

export default function OKRsPage() {
  const [items, setItems] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/cpm/okrs")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total      = items.length;
  const emProgresso = items.filter(o => o.status === "Em Progresso").length;
  const concluidos  = items.filter(o => o.status === "Concluído").length;
  const avgProgress = total > 0
    ? Math.round(items.reduce((acc, o) => acc + o.progress, 0) / total)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/cpm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <Target size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">OKRs</h1>
            <p className="text-xs text-gray-500">CPM · Objetivos e Resultados-Chave</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total OKRs</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Em Progresso</p>
              <p className="text-2xl font-bold text-blue-600">{emProgresso}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Concluídos</p>
              <p className="text-2xl font-bold text-emerald-600">{concluidos}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Progresso Médio</p>
              <p className="text-2xl font-bold text-gray-900">{avgProgress}%</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Objetivo</th>
                  <th className="text-left px-4 py-3">Ciclo</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Responsável</th>
                  <th className="text-left px-4 py-3 w-32">Progresso</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  items.map(okr => (
                    <tr key={okr.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {okr.objective.length > 60 ? okr.objective.slice(0, 60) + "…" : okr.objective}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{okr.cycle}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[okr.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {okr.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{okr.owner}</td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div style={{ width: `${okr.progress}%` }} className="h-2 bg-brand-600 rounded-full" />
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">{okr.progress}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[okr.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {okr.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

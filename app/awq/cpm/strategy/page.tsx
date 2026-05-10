"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import type { StrategicObjective } from "@/lib/cpm-db";

const PERSPECTIVE_BADGE: Record<string, string> = {
  "Financeira":          "bg-emerald-100 text-emerald-700",
  "Cliente":             "bg-blue-100 text-blue-700",
  "Processos Internos":  "bg-amber-100 text-amber-700",
  "Aprendizado":         "bg-purple-100 text-purple-700",
};

const STATUS_BADGE: Record<string, string> = {
  "Proposta":     "bg-gray-100 text-gray-600",
  "Aprovada":     "bg-blue-100 text-blue-700",
  "Em Execução":  "bg-amber-100 text-amber-700",
  "Concluída":    "bg-emerald-100 text-emerald-700",
  "Cancelada":    "bg-red-100 text-red-700",
};

export default function EstratégiaPage() {
  const [items, setItems] = useState<StrategicObjective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/cpm/strategy")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total       = items.length;
  const emExecucao  = items.filter(o => o.status === "Em Execução").length;
  const concluidas  = items.filter(o => o.status === "Concluída").length;
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
            <h1 className="text-lg font-bold text-gray-900">Estratégia</h1>
            <p className="text-xs text-gray-500">CPM · Objetivos Estratégicos</p>
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
              <p className="text-xs text-gray-500">Total Objetivos</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Em Execução</p>
              <p className="text-2xl font-bold text-amber-600">{emExecucao}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Concluídas</p>
              <p className="text-2xl font-bold text-emerald-600">{concluidas}</p>
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
                  <th className="text-left px-4 py-3">Perspectiva</th>
                  <th className="text-left px-4 py-3">Responsável</th>
                  <th className="text-left px-4 py-3">Prazo</th>
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
                  items.map(obj => (
                    <tr key={obj.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{obj.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PERSPECTIVE_BADGE[obj.perspective] ?? "bg-gray-100 text-gray-600"}`}>
                          {obj.perspective}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{obj.owner}</td>
                      <td className="px-4 py-3 text-gray-600">{obj.target_date}</td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div style={{ width: `${obj.progress}%` }} className="h-2 bg-brand-600 rounded-full" />
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">{obj.progress}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[obj.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {obj.status}
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import type { Scorecard } from "@/lib/cpm-db";

export default function ScorecardsPage() {
  const [items, setItems] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/cpm/scorecards")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total      = items.length;
  const avgScore   = total > 0
    ? (items.reduce((acc, s) => acc + s.overall_score, 0) / total).toFixed(1)
    : "0.0";
  const latestPeriod = items.length > 0
    ? items.reduce((a, b) => a.created_at > b.created_at ? a : b).period
    : "—";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/cpm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <LayoutDashboard size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Scorecards</h1>
            <p className="text-xs text-gray-500">CPM · Balanced Scorecard</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total Scorecards</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Score Médio Geral</p>
              <p className="text-2xl font-bold text-gray-900">{avgScore}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Período Mais Recente</p>
              <p className="text-2xl font-bold text-gray-900">{latestPeriod}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Período</th>
                  <th className="text-left px-4 py-3">BU</th>
                  <th className="text-left px-4 py-3">Score Geral</th>
                  <th className="text-left px-4 py-3">Nº KPIs</th>
                  <th className="text-left px-4 py-3">Criado</th>
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
                  items.map(sc => (
                    <tr key={sc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{sc.name}</td>
                      <td className="px-4 py-3 text-gray-600">{sc.period}</td>
                      <td className="px-4 py-3 text-gray-600">{sc.bu}</td>
                      <td className="px-4 py-3 text-gray-600">{sc.overall_score.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-gray-600">{sc.kpis.length}</td>
                      <td className="px-4 py-3 text-gray-600">{sc.created_at.split("T")[0]}</td>
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

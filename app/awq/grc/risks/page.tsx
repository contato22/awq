"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Search } from "lucide-react";
import type { GRCRisk } from "@/lib/grc-db";

const levelBadge: Record<string, string> = {
  "Baixo":   "bg-emerald-100 text-emerald-700",
  "Médio":   "bg-amber-100 text-amber-700",
  "Alto":    "bg-orange-100 text-orange-700",
  "Crítico": "bg-red-100 text-red-600",
};

const statusBadge: Record<string, string> = {
  "Identificado":   "bg-gray-100 text-gray-600",
  "Em Tratamento":  "bg-blue-100 text-blue-700",
  "Mitigado":       "bg-emerald-100 text-emerald-700",
  "Aceito":         "bg-purple-100 text-purple-700",
};

export default function RiscosPage() {
  const [items, setItems] = useState<GRCRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/grc/risks")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.owner.toLowerCase().includes(search.toLowerCase())
  );

  const total       = items.length;
  const criticos    = items.filter(r => r.level === "Crítico").length;
  const altos       = items.filter(r => r.level === "Alto").length;
  const emTratamento = items.filter(r => r.status === "Em Tratamento").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/grc" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Riscos</h1>
            <p className="text-xs text-gray-500">GRC · Riscos</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total riscos</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Críticos</p>
            <p className="text-2xl font-bold text-red-600">{criticos}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Altos</p>
            <p className="text-2xl font-bold text-orange-600">{altos}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Em tratamento</p>
            <p className="text-2xl font-bold text-blue-600">{emTratamento}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por risco ou responsável…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Risco</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">P×I</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nível</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Responsável</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                    <td className="px-4 py-3 text-gray-600">{r.category}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{r.risk_score}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${levelBadge[r.level] ?? "bg-gray-100 text-gray-600"}`}>
                        {r.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.owner}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {r.status}
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

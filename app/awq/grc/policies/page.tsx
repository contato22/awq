"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Search } from "lucide-react";
import type { GRCPolicy } from "@/lib/grc-db";

const TODAY = "2026-05-10";

const statusBadge: Record<string, string> = {
  "Rascunho":   "bg-gray-100 text-gray-600",
  "Em Revisão": "bg-amber-100 text-amber-700",
  "Aprovada":   "bg-emerald-100 text-emerald-700",
  "Obsoleta":   "bg-red-100 text-red-600",
};

export default function PolíticasPage() {
  const [items, setItems] = useState<GRCPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/grc/policies")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.owner.toLowerCase().includes(search.toLowerCase())
  );

  const total       = items.length;
  const aprovadas   = items.filter(p => p.status === "Aprovada").length;
  const emRevisao   = items.filter(p => p.status === "Em Revisão").length;
  const vencidas    = items.filter(p => p.review_date < TODAY).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/grc" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Políticas</h1>
            <p className="text-xs text-gray-500">GRC · Políticas</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total políticas</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Aprovadas</p>
            <p className="text-2xl font-bold text-emerald-600">{aprovadas}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Em revisão</p>
            <p className="text-2xl font-bold text-amber-600">{emRevisao}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Revisão vencida</p>
            <p className="text-2xl font-bold text-red-600">{vencidas}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título ou responsável…"
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
            <FileText size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Título</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Responsável</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Versão</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Vigência</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Revisão</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category}</td>
                    <td className="px-4 py-3 text-gray-600">{p.owner}</td>
                    <td className="px-4 py-3 text-gray-600">{p.version}</td>
                    <td className="px-4 py-3 text-gray-600">{p.effective_date}</td>
                    <td className={`px-4 py-3 ${p.review_date < TODAY ? "text-red-600 font-medium" : "text-gray-600"}`}>
                      {p.review_date}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status}
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Search } from "lucide-react";
import type { GRCControl } from "@/lib/grc-db";

const statusBadge: Record<string, string> = {
  "Efetivo":                "bg-emerald-100 text-emerald-700",
  "Parcialmente Efetivo":   "bg-amber-100 text-amber-700",
  "Inefetivo":              "bg-red-100 text-red-600",
  "Não Testado":            "bg-gray-100 text-gray-600",
};

export default function ControlesPage() {
  const [items, setItems] = useState<GRCControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/grc/controls")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.owner.toLowerCase().includes(search.toLowerCase())
  );

  const total       = items.length;
  const efetivos    = items.filter(c => c.status === "Efetivo").length;
  const inefetivos  = items.filter(c => c.status === "Inefetivo").length;
  const naoTestados = items.filter(c => c.status === "Não Testado").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/grc" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Controles</h1>
            <p className="text-xs text-gray-500">GRC · Controles</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total controles</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Efetivos</p>
            <p className="text-2xl font-bold text-emerald-600">{efetivos}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Inefetivos</p>
            <p className="text-2xl font-bold text-red-600">{inefetivos}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Não testados</p>
            <p className="text-2xl font-bold text-gray-600">{naoTestados}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por controle ou responsável…"
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
            <ShieldCheck size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Controle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Frequência</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Responsável</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Último Teste</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Próximo Teste</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                    <td className="px-4 py-3 text-gray-600">{c.type}</td>
                    <td className="px-4 py-3 text-gray-600">{c.frequency}</td>
                    <td className="px-4 py-3 text-gray-600">{c.owner}</td>
                    <td className="px-4 py-3 text-gray-600">{c.last_test_date ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.next_test_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {c.status}
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

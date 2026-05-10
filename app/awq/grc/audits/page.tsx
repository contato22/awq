"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Search } from "lucide-react";
import type { GRCAudit } from "@/lib/grc-db";

const statusBadge: Record<string, string> = {
  "Planejada":     "bg-blue-100 text-blue-700",
  "Em Andamento":  "bg-amber-100 text-amber-700",
  "Concluída":     "bg-emerald-100 text-emerald-700",
  "Cancelada":     "bg-gray-100 text-gray-600",
};

export default function AuditoriasPage() {
  const [items, setItems] = useState<GRCAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/grc/audits")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.auditor.toLowerCase().includes(search.toLowerCase())
  );

  const total           = items.length;
  const emAndamento     = items.filter(a => a.status === "Em Andamento").length;
  const totalFindings   = items.reduce((sum, a) => sum + a.findings, 0);
  const criticalFindings = items.reduce((sum, a) => sum + a.critical_findings, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/grc" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Auditorias</h1>
            <p className="text-xs text-gray-500">GRC · Auditorias</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total auditorias</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Em andamento</p>
            <p className="text-2xl font-bold text-amber-600">{emAndamento}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Achados totais</p>
            <p className="text-2xl font-bold text-gray-900">{totalFindings}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Achados críticos</p>
            <p className="text-2xl font-bold text-red-600">{criticalFindings}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por auditoria ou auditor…"
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
            <ClipboardList size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Auditoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Escopo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Auditor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Início</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Término</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Achados</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Críticos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                    <td className="px-4 py-3 text-gray-600">{a.scope}</td>
                    <td className="px-4 py-3 text-gray-600">{a.auditor}</td>
                    <td className="px-4 py-3 text-gray-600">{a.start_date}</td>
                    <td className="px-4 py-3 text-gray-600">{a.end_date ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{a.findings}</td>
                    <td className={`px-4 py-3 text-right font-medium ${a.critical_findings > 0 ? "text-red-600" : "text-gray-600"}`}>
                      {a.critical_findings}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {a.status}
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

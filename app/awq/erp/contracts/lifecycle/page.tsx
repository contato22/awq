"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FileSignature } from "lucide-react";
import type { ERPContract } from "@/lib/erp-db";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_BADGE: Record<string, string> = {
  Rascunho:      "bg-gray-100 text-gray-600",
  Ativo:         "bg-emerald-100 text-emerald-700",
  "Em Renovação":"bg-amber-100 text-amber-700",
  Encerrado:     "bg-blue-100 text-blue-700",
  Cancelado:     "bg-red-100 text-red-700",
};

const TODAY = new Date("2026-05-10");
const MS_60_DAYS = 60 * 24 * 60 * 60 * 1000;

export default function ContractLifecyclePage() {
  const [items, setItems] = useState<ERPContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/erp/contracts")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = items.filter(
    c => c.numero.toLowerCase().includes(q) || c.counterparty.toLowerCase().includes(q)
  );

  const total      = items.length;
  const ativos     = items.filter(c => c.status === "Ativo").length;
  const encerrando = items.filter(c => {
    const end = new Date(c.end_date);
    return end >= TODAY && end.getTime() - TODAY.getTime() <= MS_60_DAYS;
  }).length;
  const encerrados = items.filter(c => c.status === "Encerrado").length;

  const statusCounts: Record<string, number> = {};
  for (const c of items) statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;

  const STAGES = [
    { key: "Rascunho",      label: "Rascunho",      color: "bg-gray-100 text-gray-600  border-gray-200" },
    { key: "Ativo",         label: "Ativo",          color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { key: "Em Renovação",  label: "Renovação",      color: "bg-amber-50 text-amber-700 border-amber-200" },
    { key: "Encerrado",     label: "Encerrado",      color: "bg-blue-50 text-blue-700 border-blue-200" },
    { key: "Cancelado",     label: "Cancelado",      color: "bg-red-50 text-red-700 border-red-200" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/contracts" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ciclo de Vida dos Contratos</h1>
            <p className="text-xs text-gray-500">ERP · Contratos</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Ativos</div>
            <div className="text-2xl font-bold text-emerald-700">{ativos}</div>
          </div>
          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Encerrando (60 dias)</div>
            <div className="text-2xl font-bold text-amber-700">{encerrando}</div>
          </div>
          <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Encerrados</div>
            <div className="text-2xl font-bold text-blue-700">{encerrados}</div>
          </div>
        </div>

        {/* Status stage cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STAGES.map((stage) => (
            <div key={stage.key} className={`border rounded-xl p-4 text-center ${stage.color}`}>
              <div className="text-xs font-semibold mb-1">{stage.label}</div>
              <div className="text-2xl font-bold">{statusCounts[stage.key] ?? 0}</div>
              <div className="text-[10px] opacity-70 mt-0.5">contratos</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contrato ou contraparte…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Full contract table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Todos os Contratos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Contrato", "Contraparte", "Início", "Término", "Status", "Valor"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <FileSignature size={28} className="text-gray-200" />
                        <p className="text-sm text-gray-400">Nenhum registro encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{c.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.counterparty}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{c.start_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{c.end_date}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtBRL(c.total_value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

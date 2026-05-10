"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, FileSignature } from "lucide-react";
import type { ERPContract } from "@/lib/erp-db";

const STATUS_BADGE: Record<string, string> = {
  Rascunho:      "bg-gray-100 text-gray-600",
  Ativo:         "bg-emerald-100 text-emerald-700",
  "Em Renovação": "bg-amber-100 text-amber-700",
  Encerrado:     "bg-blue-100 text-blue-700",
  Cancelado:     "bg-red-100 text-red-700",
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ContractsPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ERPContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/erp/contracts")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date("2026-05-10");
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const totalCount = items.length;
  const ativos = items.filter(x => x.status === "Ativo");
  const ativosCount = ativos.length;
  const vencendo30 = items.filter(x => {
    const end = new Date(x.end_date);
    return end >= today && end <= in30;
  }).length;
  const valorVigente = ativos.reduce((sum, x) => sum + x.total_value, 0);

  const q = search.toLowerCase();
  const filtered = items.filter(x =>
    x.numero.toLowerCase().includes(q) || x.counterparty.toLowerCase().includes(q)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Contratos</h1>
              <p className="text-xs text-gray-500">ERP · Gestão de Contratos</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Novo Contrato
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Contratos</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : totalCount}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ativos</div>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "—" : ativosCount}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vencendo em 30 dias</div>
            <div className="text-2xl font-bold text-amber-600">{loading ? "—" : vencendo30}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Total Vigente</div>
            <div className="text-2xl font-bold text-brand-600">{loading ? "—" : fmtBRL(valorVigente)}</div>
          </div>
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

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Contrato", "Contraparte", "Objeto", "Valor Total", "Início", "Término", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <FileSignature size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Novo Contrato
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{item.counterparty}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.object}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtBRL(item.total_value)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.start_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.end_date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_BADGE).map(([status, cls]) => (
            <span key={status} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{status}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ClipboardList } from "lucide-react";
import type { ERPContract } from "@/lib/erp-db";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ContractObligationsPage() {
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

  const active = items.filter(c => c.status === "Ativo");
  const q = search.toLowerCase();
  const filtered = active.filter(
    c => c.counterparty.toLowerCase().includes(q) || c.object.toLowerCase().includes(q)
  );

  const totalValor = active.reduce((s, c) => s + c.total_value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/erp/contracts" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Obrigações Contratuais</h1>
              <p className="text-xs text-gray-500">ERP · Contratos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Total Obrigações Ativas</div>
            <div className="text-2xl font-bold text-gray-900">{active.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Valor Total Vigente</div>
            <div className="text-2xl font-bold text-gray-900">{fmtBRL(totalValor)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contraparte ou objeto…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Contrato", "Contraparte", "Objeto", "Término", "BU", "Valor"].map((h) => (
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
                    <td colSpan={6} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <ClipboardList size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{c.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.counterparty}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.object}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{c.end_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.bu}</td>
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

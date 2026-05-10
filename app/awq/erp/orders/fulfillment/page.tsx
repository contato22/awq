"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Package } from "lucide-react";
import type { SalesOrder } from "@/lib/erp-db";

const STATUS_BADGE: Record<string, string> = {
  Novo:              "bg-gray-100 text-gray-600",
  "Em Processamento": "bg-blue-100 text-blue-700",
  Faturado:          "bg-emerald-100 text-emerald-700",
  Entregue:          "bg-purple-100 text-purple-700",
  Cancelado:         "bg-red-100 text-red-700",
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FulfillmentPage() {
  const [search, setSearch]   = useState("");
  const [orders, setOrders]   = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/erp/sales")
      .then(r => r.json())
      .then(j => { if (j.success) setOrders(j.data.filter((o: SalesOrder) => o.status === "Em Processamento")); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      o.numero.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q)
    );
  });

  const valorTotal = orders.reduce((s, o) => s + o.value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Fulfillment</h1>
              <p className="text-xs text-gray-500">ERP · Pedidos · Fulfillment</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Separação
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pedidos em Fulfillment</div>
            <div className="text-2xl font-bold text-blue-600">{loading ? "—" : orders.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Total</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : fmtBRL(valorTotal)}</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido ou cliente…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Pedido", "Cliente", "Data", "Valor", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16">
                      <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Package size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Nova Separação
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{o.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{o.customer}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{o.date}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{fmtBRL(o.value)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {o.status}
                        </span>
                      </td>
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

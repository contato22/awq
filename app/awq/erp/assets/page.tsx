"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Layers } from "lucide-react";
import type { FixedAsset } from "@/lib/erp-db";

const STATUS_BADGE: Record<string, string> = {
  Ativo:          "bg-emerald-100 text-emerald-700",
  "Em Manutenção": "bg-amber-100 text-amber-700",
  Baixado:        "bg-gray-100 text-gray-500",
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/erp/assets")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCount = items.length;
  const ativosCount = items.filter(x => x.status === "Ativo").length;
  const manutencaoCount = items.filter(x => x.status === "Em Manutenção").length;
  const valorTotal = items
    .filter(x => x.status === "Ativo")
    .reduce((sum, x) => sum + x.acquisition_value, 0);

  const q = search.toLowerCase();
  const filtered = items.filter(x =>
    x.code.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)
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
              <h1 className="text-lg font-bold text-gray-900">Gestão de Assets</h1>
              <p className="text-xs text-gray-500">ERP · Ativo Fixo</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Novo Asset
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Assets</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : totalCount}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assets Ativos</div>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "—" : ativosCount}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Em Manutenção</div>
            <div className="text-2xl font-bold text-amber-600">{loading ? "—" : manutencaoCount}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Total</div>
            <div className="text-2xl font-bold text-brand-600">{loading ? "—" : fmtBRL(valorTotal)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar asset ou código…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Código", "Descrição", "Categoria", "Localização", "Valor Aquisição", "Data Aquisição", "Status"].map((h) => (
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
                        <Layers size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Novo Asset
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtBRL(item.acquisition_value)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.acquisition_date}</td>
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

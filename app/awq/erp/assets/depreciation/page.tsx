"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, TrendingDown } from "lucide-react";
import type { FixedAsset } from "@/lib/erp-db";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthlyDepr(a: FixedAsset) {
  return (a.acquisition_value - a.residual_value) / a.useful_life_months;
}

function bookValue(a: FixedAsset) {
  return Math.max(a.acquisition_value - a.accumulated_depreciation, a.residual_value);
}

export default function AssetDepreciationPage() {
  const [items, setItems] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/erp/assets")
      .then((r) => r.json())
      .then((j) => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = items.filter((a) => a.is_active === true);

  const filtered = active.filter((a) => {
    const q = search.toLowerCase();
    return a.code.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
  });

  const totalMonthlyDepr = filtered.reduce((s, a) => s + monthlyDepr(a), 0);
  const totalBookValue = filtered.reduce((s, a) => s + bookValue(a), 0);
  const totalAccumDepr = filtered.reduce((s, a) => s + a.accumulated_depreciation, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/assets" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Depreciação de Assets</h1>
            <p className="text-xs text-gray-500">ERP · Ativo Fixo</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Ativos</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : filtered.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Depr. Mensal Total</div>
            <div className="text-2xl font-bold text-red-600">{loading ? "—" : fmtBRL(totalMonthlyDepr)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Líquido Total</div>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "—" : fmtBRL(totalBookValue)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Depr. Acumulada Total</div>
            <div className="text-2xl font-bold text-orange-600">{loading ? "—" : fmtBRL(totalAccumDepr)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar asset…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
        ) : (
          /* Table */
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Código", "Ativo", "Categoria", "Custo", "Depr. Acum.", "Valor Líquido", "Depr/Mês", "% Depreciado"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <TrendingDown size={32} className="text-gray-200" />
                          <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => {
                      const pct = a.acquisition_value > 0
                        ? Math.min((a.accumulated_depreciation / a.acquisition_value) * 100, 100)
                        : 0;
                      return (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">{a.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{a.description}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.category}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap tabular-nums">{fmtBRL(a.acquisition_value)}</td>
                          <td className="px-4 py-3 text-xs text-red-600 whitespace-nowrap tabular-nums">{fmtBRL(a.accumulated_depreciation)}</td>
                          <td className="px-4 py-3 text-xs text-emerald-700 whitespace-nowrap tabular-nums font-medium">{fmtBRL(bookValue(a))}</td>
                          <td className="px-4 py-3 text-xs text-orange-600 whitespace-nowrap tabular-nums">{fmtBRL(monthlyDepr(a))}</td>
                          <td className="px-4 py-3 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-orange-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500 tabular-nums whitespace-nowrap">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

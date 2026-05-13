"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, TrendingDown } from "lucide-react";
import type { ErpAsset } from "@/lib/erp-db";

export default function AssetDepreciationPage() {
  const [data, setData] = useState<ErpAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/erp/assets").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  const pct = (n: number) => `${n}%`;
  const vidaUtil = (dep: number) => dep > 0 ? `${Math.round(100 / dep)} anos` : "—";

  const filtered = data.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()));
  const totalOriginal = data.reduce((s, d) => s + (d.acquisition_cost ?? 0), 0);
  const totalDepreciation = data.reduce((s, d) => s + ((d.acquisition_cost ?? 0) - (d.current_value ?? 0)), 0);
  const totalNet = data.reduce((s, d) => s + (d.current_value ?? 0), 0);

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
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Valor Original Total",  value: fmt(totalOriginal),     color: "text-gray-900"    },
            { label: "Depreciação Acumulada", value: fmt(totalDepreciation), color: "text-red-600"     },
            { label: "Valor Líquido Contábil",value: fmt(totalNet),          color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar asset…" className="flex-1 text-sm focus:outline-none bg-transparent" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Asset", "Categoria", "Vida Útil", "Taxa % a.a.", "Valor Original", "Dep. Acumulada", "Valor Líquido"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <TrendingDown size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(a => {
                  const depAcumulada = (a.acquisition_cost ?? 0) - (a.current_value ?? 0);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                      <td className="px-4 py-3 text-gray-600">{a.category}</td>
                      <td className="px-4 py-3 text-gray-600">{vidaUtil(a.depreciation_pct ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{pct(a.depreciation_pct ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-700">{fmt(a.acquisition_cost ?? 0)}</td>
                      <td className="px-4 py-3 text-red-600">{fmt(depAcumulada)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{fmt(a.current_value ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

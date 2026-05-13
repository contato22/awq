"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, RefreshCw, AlertTriangle } from "lucide-react";
import type { ErpContract } from "@/lib/erp-db";

export default function ContractRenewalsPage() {
  const [data, setData] = useState<ErpContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/erp/contracts").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const today = new Date();
  const daysUntil = (dateStr: string | null) => {
    if (!dateStr) return Infinity;
    return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
  };

  const expiring = data
    .filter(c => c.status !== "Encerrado" && c.end_date && daysUntil(c.end_date) <= 90)
    .sort((a, b) => daysUntil(a.end_date) - daysUntil(b.end_date));

  const filtered = expiring.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.party?.toLowerCase().includes(search.toLowerCase()));

  const count30 = expiring.filter(c => daysUntil(c.end_date) <= 30).length;
  const count60 = expiring.filter(c => daysUntil(c.end_date) <= 60).length;
  const count90 = expiring.length;

  const urgencyColor = (days: number) => {
    if (days <= 30) return "bg-red-500";
    if (days <= 60) return "bg-amber-400";
    return "bg-emerald-500";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/contracts" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
          <div><h1 className="text-lg font-bold text-gray-900">Renovações de Contratos</h1><p className="text-xs text-gray-500">ERP · Contratos</p></div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Vencendo em < 30 dias", count: count30, color: "border-red-200 bg-red-50",    textColor: "text-red-600"   },
            { label: "Vencendo em < 60 dias", count: count60, color: "border-amber-200 bg-amber-50", textColor: "text-amber-600" },
            { label: "Vencendo em < 90 dias", count: count90, color: "border-blue-200 bg-blue-50",   textColor: "text-blue-600"  },
          ].map(({ label, count, color, textColor }) => (
            <div key={label} className={`border rounded-xl p-4 shadow-sm ${color}`}>
              <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
              <div className={`text-2xl font-bold ${textColor}`}>{loading ? "—" : count}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm"><Search size={14} className="text-gray-400 shrink-0" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato ou contraparte…" className="flex-1 text-sm focus:outline-none bg-transparent" /></div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50"><tr>{["Contrato", "Contraparte", "Vencimento", "Dias Restantes", "Valor", ""].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-16"><div className="flex flex-col items-center gap-3 text-center"><AlertTriangle size={32} className="text-gray-200" /><p className="text-sm font-medium text-gray-500">Nenhum contrato próximo do vencimento</p></div></td></tr>
                : filtered.map(c => {
                  const days = daysUntil(c.end_date);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.party}</td>
                      <td className="px-4 py-3 text-gray-500">{c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${urgencyColor(days)}`}></span>
                          <span className="text-sm font-medium text-gray-700">{days === Infinity ? "—" : `${days}d`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmt(c.value ?? 0)}</td>
                      <td className="px-4 py-3"><button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"><RefreshCw size={11} /> Renovar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {[["bg-red-500", "< 30 dias"], ["bg-amber-400", "< 60 dias"], ["bg-emerald-500", "> 60 dias"]].map(([dot, label]) => (
            <div key={label} className="flex items-center gap-1.5"><span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`}></span><span>{label}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Package, Trash2, TrendingDown } from "lucide-react";
import type { EpmFixedAsset } from "@/lib/epm-dynamic";

const CATEGORIES = ["HARDWARE", "SOFTWARE", "FURNITURE", "EQUIPMENT", "VEHICLE"] as const;
const BUS = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
const CAT_COLORS: Record<string, string> = {
  HARDWARE:  "bg-blue-100 text-blue-700",
  SOFTWARE:  "bg-purple-100 text-purple-700",
  FURNITURE: "bg-amber-100 text-amber-700",
  EQUIPMENT: "bg-orange-100 text-orange-700",
  VEHICLE:   "bg-gray-100 text-gray-600",
};

const EMPTY = { asset_code: "", asset_name: "", asset_category: "HARDWARE" as string, bu: "AWQ" as string, acquisition_date: null as string|null, cost: 0, useful_life_months: 60, residual_value: 0, accumulated_depreciation: 0, is_active: true, notes: "" };

function fmtBRL(n: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n); }
function bookValue(a: EpmFixedAsset) { return Math.max(a.cost - a.accumulated_depreciation, a.residual_value); }
function monthlyDep(a: EpmFixedAsset) { return a.useful_life_months > 0 ? (a.cost - a.residual_value) / a.useful_life_months : 0; }
function depPct(a: EpmFixedAsset) { return a.cost > 0 ? (a.accumulated_depreciation / a.cost) * 100 : 0; }

export default function FixedAssetsPage() {
  const [data, setData] = useState<EpmFixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/epm/fixed-assets").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/epm/fixed-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, cost: Number(form.cost), useful_life_months: Number(form.useful_life_months), residual_value: Number(form.residual_value), accumulated_depreciation: Number(form.accumulated_depreciation), acquisition_date: form.acquisition_date || null }) });
    const j = await r.json();
    setData(p => [...p, j.data]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/epm/fixed-assets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const categories = ["Todos", ...CATEGORIES];
  const filtered = data.filter(d => {
    if (catFilter !== "Todos" && d.asset_category !== catFilter) return false;
    if (search && !d.asset_name?.toLowerCase().includes(search.toLowerCase()) && !d.asset_code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCost = data.reduce((s, a) => s + (a.cost ?? 0), 0);
  const totalBook = data.reduce((s, a) => s + bookValue(a), 0);
  const totalDep  = data.reduce((s, a) => s + (a.accumulated_depreciation ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/epm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
            <div><h1 className="text-lg font-bold text-gray-900">Ativo Imobilizado</h1><p className="text-xs text-gray-500">EPM · Ativos Fixos</p></div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><Plus size={14} /> Novo Ativo</button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Custo Total (CAPEX)", value: fmtBRL(totalCost), icon: Package,     color: "text-blue-600"    },
            { label: "Depreciação Acumulada", value: fmtBRL(totalDep), icon: TrendingDown, color: "text-red-500"    },
            { label: "Valor Contábil Líquido", value: fmtBRL(totalBook), icon: Package,   color: "text-emerald-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Icon size={14} className={color} /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span></div>
              <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm"><Search size={14} className="text-gray-400 shrink-0" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ativo…" className="text-sm focus:outline-none bg-transparent w-48" /></div>
          <div className="flex gap-1">{categories.map(c => <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${catFilter === c ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{c}</button>)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50"><tr>{["Código", "Ativo", "Categoria", "BU", "Aquisição", "Custo", "Dep. Acum.", "Valor Líquido", "Dep/Mês", "%", ""].map(h => <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={11} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={11} className="px-4 py-16"><div className="flex flex-col items-center gap-3 text-center"><Package size={32} className="text-gray-200" /><p className="text-sm font-medium text-gray-500">Nenhum ativo encontrado</p></div></td></tr>
                : filtered.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${!a.is_active ? "opacity-50" : ""}`}>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{a.asset_code || "—"}</td>
                    <td className="px-3 py-3 font-medium text-gray-900 max-w-[180px] truncate">{a.asset_name}</td>
                    <td className="px-3 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${CAT_COLORS[a.asset_category] ?? "bg-gray-100 text-gray-600"}`}>{a.asset_category}</span></td>
                    <td className="px-3 py-3 text-xs text-gray-500">{a.bu}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{a.acquisition_date ? new Date(a.acquisition_date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{fmtBRL(a.cost ?? 0)}</td>
                    <td className="px-3 py-3 text-sm text-red-500">{fmtBRL(a.accumulated_depreciation ?? 0)}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-gray-900">{fmtBRL(bookValue(a))}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{fmtBRL(monthlyDep(a))}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{depPct(a).toFixed(0)}%</td>
                    <td className="px-3 py-3"><button onClick={() => onDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Novo Ativo Imobilizado</h2></div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["Código", "asset_code"], ["Nome do Ativo", "asset_name"]].map(([label, key]) => (
                  <div key={key} className={key === "asset_name" ? "col-span-2" : ""}><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={key === "asset_name"} /></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.asset_category} onChange={e => setForm(p => ({ ...p, asset_category: e.target.value }))}>{CATEGORIES.map(o => <option key={o}>{o}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">BU</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.bu} onChange={e => setForm(p => ({ ...p, bu: e.target.value }))}>{BUS.map(o => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Data de Aquisição</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.acquisition_date ?? ""} onChange={e => setForm(p => ({ ...p, acquisition_date: e.target.value || null }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                {[["Custo (R$)", "cost"], ["Vida Útil (meses)", "useful_life_months"], ["Valor Residual (R$)", "residual_value"], ["Dep. Acumulada (R$)", "accumulated_depreciation"]].map(([label, key]) => (
                  <div key={key}><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label><input type="number" min={0} step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as number} onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} /></div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

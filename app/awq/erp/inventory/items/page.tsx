"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Package, X, Loader2, AlertTriangle } from "lucide-react";

const UNITS = ["un", "kg", "m", "cx", "lt", "pc"];

type Item = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  sale_price: number | null;
  stock_qty: number;
  min_stock: number;
  erp_inventory_warehouses?: { name: string } | null;
};

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

export default function InventoryItemsPage() {
  const [items, setItems]       = useState<Item[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    sku: "", name: "", category: "", unit: "un",
    unit_cost: "", sale_price: "", stock_qty: "0", min_stock: "0",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/erp/inventory${qs}`);
    if (!res.ok) { setError("Erro ao carregar itens"); setLoading(false); return; }
    setItems(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/erp/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unit_cost:  parseFloat(form.unit_cost)  || 0,
        sale_price: parseFloat(form.sale_price) || null,
        stock_qty:  parseFloat(form.stock_qty)  || 0,
        min_stock:  parseFloat(form.min_stock)  || 0,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ sku: "", name: "", category: "", unit: "un", unit_cost: "", sale_price: "", stock_qty: "0", min_stock: "0" });
      load();
    } else {
      const { error: err } = await res.json();
      setError(err ?? "Erro ao salvar");
    }
    setSaving(false);
  };

  const lowStock = items.filter(i => Number(i.stock_qty) <= Number(i.min_stock)).length;
  const totalValue = items.reduce((s, i) => s + Number(i.stock_qty) * Number(i.unit_cost), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Produtos e Itens</h1>
              <p className="text-xs text-gray-500">ERP · Estoque</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Novo Item
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Itens",    value: loading ? "…" : String(items.length),           color: "text-gray-900"   },
            { label: "Abaixo Mínimo",  value: loading ? "…" : String(lowStock),               color: "text-red-600"    },
            { label: "Categorias",     value: loading ? "…" : String(new Set(items.map(i => i.category)).size), color: "text-brand-600" },
            { label: "Valor em Estoque", value: loading ? "…" : `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar código ou descrição…" className="flex-1 text-sm focus:outline-none bg-transparent" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["SKU", "Nome", "Categoria", "Unidade", "Estoque", "Est. Mínimo", "Custo Unit.", "Localização"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center"><Loader2 size={24} className="animate-spin text-gray-300 mx-auto" /></td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Package size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum item cadastrado</p>
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Novo Item
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map(i => {
                    const belowMin = Number(i.stock_qty) <= Number(i.min_stock);
                    return (
                      <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{i.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{i.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{i.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{i.unit}</td>
                        <td className="px-4 py-3 text-sm tabular-nums">
                          <span className={belowMin ? "text-red-600 font-semibold flex items-center gap-1" : "text-gray-900"}>
                            {belowMin && <AlertTriangle size={12} />}
                            {Number(i.stock_qty).toLocaleString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">{Number(i.min_stock).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 tabular-nums">
                          R$ {Number(i.unit_cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{i.erp_inventory_warehouses?.name ?? "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo Item</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SKU *</label>
                  <input required value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="PROD-001" className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unidade</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={INPUT}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Caneta esferográfica azul" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria *</label>
                <input required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Papelaria" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Custo Unitário (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0,00" className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Preço de Venda (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="0,00" className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estoque Inicial</label>
                  <input type="number" step="0.001" min="0" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estoque Mínimo</label>
                  <input type="number" step="0.001" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {saving && <Loader2 size={13} className="animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

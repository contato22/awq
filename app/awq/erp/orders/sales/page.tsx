"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, ShoppingBag, X, Loader2 } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  Novo:               "bg-blue-100 text-blue-700",
  "Em Processamento": "bg-amber-100 text-amber-700",
  Faturado:           "bg-purple-100 text-purple-700",
  Entregue:           "bg-emerald-100 text-emerald-700",
  Cancelado:          "bg-red-100 text-red-700",
};

const BUS = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

type SalesOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  total_amount: number;
  bu_code: string;
  status: string;
};

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

export default function SalesOrdersPage() {
  const [orders, setOrders]     = useState<SalesOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    customer_name: "", bu_code: "AWQ",
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: "", total_amount: "", status: "Novo", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/erp/sales-orders${qs}`);
    if (!res.ok) { setError("Erro ao carregar pedidos"); setLoading(false); return; }
    setOrders(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/erp/sales-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        total_amount: parseFloat(form.total_amount) || 0,
        delivery_date: form.delivery_date || null,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ customer_name: "", bu_code: "AWQ", order_date: new Date().toISOString().slice(0, 10), delivery_date: "", total_amount: "", status: "Novo", notes: "" });
      load();
    } else {
      const { error: err } = await res.json();
      setError(err ?? "Erro ao salvar");
    }
    setSaving(false);
  };

  const totalValue  = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const entregues   = orders.filter(o => o.status === "Entregue").length;
  const emAberto    = orders.filter(o => o.status !== "Entregue" && o.status !== "Cancelado").length;
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Pedidos de Venda</h1>
              <p className="text-xs text-gray-500">ERP · Vendas</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Novo Pedido
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Pedidos",  value: loading ? "…" : String(orders.length), color: "text-gray-900"    },
            { label: "Em Aberto",      value: loading ? "…" : String(emAberto),      color: "text-amber-600"   },
            { label: "Entregues",      value: loading ? "…" : String(entregues),     color: "text-emerald-600" },
            { label: "Valor Total",    value: loading ? "…" : fmt(totalValue),        color: "text-brand-600"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido ou cliente…" className="flex-1 text-sm focus:outline-none bg-transparent" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Nº Pedido", "Cliente", "BU", "Data", "Entrega", "Valor", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-16 text-center"><Loader2 size={24} className="animate-spin text-gray-300 mx-auto" /></td></tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <ShoppingBag size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum pedido cadastrado</p>
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Novo Pedido de Venda
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{o.order_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{o.customer_name}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-500">{o.bu_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(o.order_date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">—</td>
                      <td className="px-4 py-3 text-sm text-gray-900 tabular-nums font-medium">
                        R$ {Number(o.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[o.status] ?? "bg-gray-100 text-gray-500"}`}>{o.status}</span>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo Pedido de Venda</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente *</label>
                <input required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Empresa XPTO Ltda." className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">BU</label>
                  <select value={form.bu_code} onChange={e => setForm(f => ({ ...f, bu_code: e.target.value }))} className={INPUT}>
                    {BUS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={INPUT}>
                    {Object.keys(STATUS_BADGE).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data do Pedido *</label>
                  <input required type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Previsão Entrega</label>
                  <input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Valor Total (R$) *</label>
                <input required type="number" step="0.01" min="0" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0,00" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={INPUT} />
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

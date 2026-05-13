"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, FileText, Trash2 } from "lucide-react";
import type { ErpInvoice } from "@/lib/erp-db";

const STATUS_BADGE: Record<string, string> = {
  Pendente:  "bg-gray-100 text-gray-600",
  Emitida:   "bg-blue-100 text-blue-700",
  Enviada:   "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-red-100 text-red-700",
};

const EMPTY = { customer: "", order_id: null as string | null, issue_date: "", value: 0, status: "Pendente" as string };

export default function BillingPage() {
  const [data, setData] = useState<ErpInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/erp/invoices").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/erp/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, value: Number(form.value), order_id: form.order_id || null }) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/erp/invoices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  const filtered = data.filter(d => !search || d.customer?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Faturamento</h1>
              <p className="text-xs text-gray-500">ERP · Pedidos</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova NF
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar NF ou cliente…" className="flex-1 text-sm focus:outline-none bg-transparent" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Cliente", "Data Emissão", "Valor", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-16"><div className="flex flex-col items-center gap-3 text-center"><FileText size={32} className="text-gray-200" /><p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p></div></td></tr>
                ) : filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.customer}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(inv.value ?? 0)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[inv.status] ?? "bg-gray-100 text-gray-600"}`}>{inv.status}</span></td>
                    <td className="px-4 py-3"><button onClick={() => onDelete(inv.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{Object.entries(STATUS_BADGE).map(([s, c]) => <span key={s} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c}`}>{s}</span>)}</div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Nova Nota Fiscal</h2></div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Data Emissão</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label><input type="number" min={0} step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.value} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{Object.keys(STATUS_BADGE).map(o => <option key={o}>{o}</option>)}</select></div>
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

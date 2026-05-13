"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Receipt, Trash2 } from "lucide-react";
import type { ErpExpense } from "@/lib/erp-db";

const STATUS_BADGE: Record<string, string> = {
  Rascunho:  "bg-gray-100 text-gray-600",
  Submetido: "bg-blue-100 text-blue-700",
  Aprovado:  "bg-emerald-100 text-emerald-700",
  Rejeitado: "bg-red-100 text-red-700",
  Pago:      "bg-purple-100 text-purple-700",
};

const CATEGORIES = ["Viagem", "Refeição", "Hospedagem", "Transporte", "Outros"];

const CATEGORY_BADGE: Record<string, string> = {
  Viagem:     "bg-sky-100 text-sky-700",
  Refeição:   "bg-orange-100 text-orange-700",
  Hospedagem: "bg-indigo-100 text-indigo-700",
  Transporte: "bg-teal-100 text-teal-700",
  Outros:     "bg-gray-100 text-gray-600",
};

const EMPTY = { employee: "", category: "Viagem" as string, description: "", amount: 0, date: "", status: "Rascunho" as string };

export default function ExpensesPage() {
  const [data, setData] = useState<ErpExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/erp/expenses").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/erp/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/erp/expenses", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  const filtered = data.filter(d => !search || d.employee?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()));

  const totalSubmetido = data.filter(d => ["Submetido", "Aprovado", "Pago"].includes(d.status)).reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalAprovado = data.filter(d => ["Aprovado", "Pago"].includes(d.status)).reduce((s, d) => s + (d.amount ?? 0), 0);
  const aguardando = data.filter(d => d.status === "Submetido").length;
  const totalPago = data.filter(d => d.status === "Pago").reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Relatório de Despesas</h1>
              <p className="text-xs text-gray-500">ERP · Time & Expense</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Despesa
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Submetido", value: fmt(totalSubmetido), color: "text-blue-600" },
            { label: "Total Aprovado",  value: fmt(totalAprovado),  color: "text-emerald-600" },
            { label: "Aguardando",      value: aguardando,           color: "text-amber-600" },
            { label: "Total Pago",      value: fmt(totalPago),       color: "text-purple-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar despesa ou colaborador…" className="flex-1 text-sm focus:outline-none bg-transparent" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Data", "Colaborador", "Categoria", "Descrição", "Valor", "Status", ""].map(h => (
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
                        <Receipt size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{e.date ? new Date(e.date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{e.employee}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE[e.category] ?? "bg-gray-100 text-gray-600"}`}>{e.category}</span></td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(e.amount ?? 0)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[e.status] ?? "bg-gray-100 text-gray-600"}`}>{e.status}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => onDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_BADGE).map(([label, cls]) => (
            <span key={label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
          ))}
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Nova Despesa</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              {[["Colaborador", "employee"], ["Descrição", "description"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={key === "employee"} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input type="number" min={0} step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.keys(STATUS_BADGE).map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

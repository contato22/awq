"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Receipt, X, Loader2 } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  Rascunho:  "bg-gray-100 text-gray-600",
  Submetido: "bg-blue-100 text-blue-700",
  Aprovado:  "bg-emerald-100 text-emerald-700",
  Rejeitado: "bg-red-100 text-red-700",
  Pago:      "bg-brand-100 text-brand-700",
};

const CATEGORIA_BADGE: Record<string, string> = {
  Viagem:     "bg-sky-100 text-sky-700",
  Refeição:   "bg-orange-100 text-orange-700",
  Hospedagem: "bg-brand-100 text-brand-700",
  Transporte: "bg-teal-100 text-teal-700",
  Software:   "bg-brand-100 text-brand-700",
  Outros:     "bg-gray-100 text-gray-600",
};

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  submitter_name: string;
  bu_code: string;
  status: string;
};

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

export default function ExpensesPage() {
  const [expenses, setExpenses]  = useState<Expense[]>([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState("");
  const [search, setSearch]      = useState("");
  const [showForm, setShowForm]  = useState(false);
  const [saving, setSaving]      = useState(false);
  const [form, setForm] = useState({
    title: "", category: "Viagem", amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    bu_code: "AWQ", description: "", status: "Rascunho",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/erp/expenses${qs}`);
    if (!res.ok) { setError("Erro ao carregar despesas"); setLoading(false); return; }
    setExpenses(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/erp/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0 }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", category: "Viagem", amount: "", expense_date: new Date().toISOString().slice(0, 10), bu_code: "AWQ", description: "", status: "Rascunho" });
      load();
    } else {
      const { error: err } = await res.json();
      setError(err ?? "Erro ao salvar");
    }
    setSaving(false);
  };

  const totalSubmitido = expenses.filter(e => e.status !== "Rascunho").reduce((s, e) => s + Number(e.amount), 0);
  const totalAprovado  = expenses.filter(e => e.status === "Aprovado" || e.status === "Pago").reduce((s, e) => s + Number(e.amount), 0);
  const aguardando     = expenses.filter(e => e.status === "Submetido").length;
  const totalPago      = expenses.filter(e => e.status === "Pago").reduce((s, e) => s + Number(e.amount), 0);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

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
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Despesa
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Submetido",     value: loading ? "…" : fmt(totalSubmitido), color: "text-blue-600"    },
            { label: "Total Aprovado",      value: loading ? "…" : fmt(totalAprovado),  color: "text-emerald-600" },
            { label: "Aguardando Aprovação",value: loading ? "…" : String(aguardando),  color: "text-amber-600"   },
            { label: "Total Pago",          value: loading ? "…" : fmt(totalPago),      color: "text-brand-600"  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
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
                  {["Data", "Colaborador", "Categoria", "Descrição", "Valor", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Loader2 size={24} className="animate-spin text-gray-300 mx-auto" /></td></tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Receipt size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhuma despesa cadastrada</p>
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Nova Despesa
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(e.expense_date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{e.submitter_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORIA_BADGE[e.category] ?? "bg-gray-100 text-gray-600"}`}>{e.category}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{e.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 tabular-nums font-medium">{fmt(Number(e.amount))}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[e.status] ?? "bg-gray-100 text-gray-500"}`}>{e.status}</span>
                      </td>
                    </tr>
                  ))
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
              <h2 className="font-bold text-gray-900">Nova Despesa</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Jantar com cliente XPTO" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria *</label>
                  <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={INPUT}>
                    {Object.keys(CATEGORIA_BADGE).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$) *</label>
                  <input required type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data *</label>
                  <input required type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={INPUT}>
                    {Object.keys(STATUS_BADGE).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observações</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={INPUT} />
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

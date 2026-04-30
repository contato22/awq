"use client";

import { useState, useEffect } from "react";
import type { ARContract, BuCode } from "@/lib/ap-ar-db";

const BUS: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];
const CATEGORIES = ["Serviço Recorrente", "Projeto", "Consultoria", "Produção", "Outros"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR"); }

const EMPTY_FORM = {
  bu_code: "JACQES" as BuCode,
  customer_name: "",
  customer_doc: "",
  description: "",
  category: "Serviço Recorrente",
  monthly_amount: "",
  billing_day: "5",
  iss_rate: "0.05",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
};

export default function ContractsPage() {
  const [contracts,  setContracts]  = useState<ARContract[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [lastGen,    setLastGen]    = useState<{ count: number } | null>(null);

  async function loadContracts() {
    setLoading(true);
    const res = await fetch("/api/epm/ar/contracts");
    const j   = await res.json();
    if (j.success) setContracts(j.data);
    setLoading(false);
  }

  useEffect(() => { loadContracts(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/epm/ar/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bu_code:       form.bu_code,
          customer_name: form.customer_name,
          customer_doc:  form.customer_doc || undefined,
          description:   form.description,
          category:      form.category,
          monthly_amount: parseFloat(form.monthly_amount),
          billing_day:   parseInt(form.billing_day),
          iss_rate:      parseFloat(form.iss_rate),
          start_date:    form.start_date,
          end_date:      form.end_date || undefined,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await loadContracts();
      }
    } finally { setSubmitting(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/epm/ar/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const j = await res.json();
      if (j.success) setLastGen({ count: (j.data as unknown[]).length });
    } finally { setGenerating(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos Recorrentes</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie contratos de receita mensal e gere AR automaticamente</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 border border-emerald-600 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            {generating ? "Gerando..." : "Gerar AR do mês"}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {showForm ? "Cancelar" : "+ Novo contrato"}
          </button>
        </div>
      </div>

      {lastGen && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
          {lastGen.count === 0
            ? "Nenhum AR gerado — todos os contratos já foram faturados neste mês."
            : `${lastGen.count} AR(s) criados com sucesso a partir dos contratos ativos.`}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Novo Contrato Recorrente</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">BU</label>
              <select value={form.bu_code} onChange={(e) => setForm((f) => ({ ...f, bu_code: e.target.value as BuCode }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {BUS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
              <input required value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                placeholder="Nome do cliente"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ/CPF</label>
              <input value={form.customer_doc}
                onChange={(e) => setForm((f) => ({ ...f, customer_doc: e.target.value }))}
                placeholder="Opcional"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição do serviço *</label>
              <input required value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Gestão de tráfego pago — mensal"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor mensal (R$) *</label>
              <input required type="number" min="0.01" step="0.01" value={form.monthly_amount}
                onChange={(e) => setForm((f) => ({ ...f, monthly_amount: e.target.value }))}
                placeholder="5000.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dia de cobrança (1-28) *</label>
              <input required type="number" min="1" max="28" value={form.billing_day}
                onChange={(e) => setForm((f) => ({ ...f, billing_day: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ISS (ex: 0.05 = 5%)</label>
              <input type="number" min="0" max="0.20" step="0.001" value={form.iss_rate}
                onChange={(e) => setForm((f) => ({ ...f, iss_rate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Início *</label>
              <input required type="date" value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Término (opcional)</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "Salvando..." : "Criar contrato"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhum contrato cadastrado.</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">BU</th>
                <th className="px-4 py-3 text-right">Mensal</th>
                <th className="px-4 py-3 text-center">Dia</th>
                <th className="px-4 py-3 text-left">Início</th>
                <th className="px-4 py-3 text-left">Término</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{c.customer_name}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate">{c.description}</td>
                  <td className="px-4 py-2 text-gray-600">{c.bu_code}</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-800">{fmt(c.monthly_amount)}</td>
                  <td className="px-4 py-2 text-center text-gray-600">dia {c.billing_day}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtDate(c.start_date)}</td>
                  <td className="px-4 py-2 text-gray-500">{c.end_date ? fmtDate(c.end_date) : "—"}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

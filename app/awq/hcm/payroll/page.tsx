"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, DollarSign, Plus } from "lucide-react";
import type { HcmPayroll } from "@/lib/hcm-db";

const EMPTY = { employee_id: "", periodo: "", gross: 0, deductions: 0, net: 0, status: "Pendente" as string };

export default function FolhadePagamentoPage() {
  const [data, setData] = useState<HcmPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/hcm/payroll").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/hcm/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, gross: Number(form.gross), deductions: Number(form.deductions), net: Number(form.net) }) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  const badge = (v: string) => {
    const map: Record<string, string> = { Pago: "bg-green-100 text-green-700", Pendente: "bg-yellow-100 text-yellow-700", Processando: "bg-blue-100 text-blue-700" };
    return `inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[v] ?? "bg-gray-100 text-gray-600"}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/hcm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Folha de Pagamento</h1>
              <p className="text-xs text-gray-500">HCM · Folha de Pagamento</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Nova Folha
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <DollarSign size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Colaborador", "Período", "Salário Bruto", "Deduções", "Salário Líquido", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.employee_id}</td>
                    <td className="px-4 py-3 text-gray-600">{p.periodo}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(p.gross)}</td>
                    <td className="px-4 py-3 text-red-600">-{fmt(p.deductions)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{fmt(p.net)}</td>
                    <td className="px-4 py-3"><span className={badge(p.status)}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Nova Folha de Pagamento</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              {[["ID do Colaborador", "employee_id", "text"], ["Período (ex: 2025-01)", "periodo", "text"]].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required />
                </div>
              ))}
              {[["Salário Bruto", "gross"], ["Deduções", "deductions"], ["Salário Líquido", "net"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label} (R$)</label>
                  <input type="number" min={0} step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as number} onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {["Pendente", "Processando", "Pago"].map(o => <option key={o}>{o}</option>)}
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

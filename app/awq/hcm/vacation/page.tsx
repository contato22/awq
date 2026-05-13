"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Plus, Trash2 } from "lucide-react";
import type { HcmAbsence } from "@/lib/hcm-db";

const STATUS_BADGE: Record<string, string> = {
  Pendente: "bg-amber-100 text-amber-700",
  Aprovado: "bg-emerald-100 text-emerald-700",
  Rejeitado: "bg-red-100 text-red-700",
  Cancelado: "bg-gray-100 text-gray-500",
};

const TYPES = ["Férias", "Licença Médica", "Licença Maternidade/Paternidade", "Folga", "Outro"];

const EMPTY = { employee_id: "", type: "Férias" as string, start_date: "", end_date: "", status: "Pendente" as string, notes: "" };

export default function FériasPage() {
  const [data, setData] = useState<HcmAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/hcm/absences").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/hcm/absences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/hcm/absences", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const pendentes = data.filter(d => d.status === "Pendente").length;
  const aprovados = data.filter(d => d.status === "Aprovado").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/hcm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Férias e Ausências</h1>
              <p className="text-xs text-gray-500">HCM · Férias</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Ausência
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Registros", value: data.length, color: "text-gray-900" },
            { label: "Pendentes", value: pendentes, color: "text-amber-600" },
            { label: "Aprovados", value: aprovados, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Colaborador", "Tipo", "Início", "Fim", "Status", "Observações", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Calendar size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum registro encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : data.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.employee_id}</td>
                    <td className="px-4 py-3 text-gray-600">{a.type}</td>
                    <td className="px-4 py-3 text-gray-500">{a.start_date ? new Date(a.start_date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{a.end_date ? new Date(a.end_date).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[a.status] ?? "bg-gray-100 text-gray-500"}`}>{a.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
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
          {Object.entries(STATUS_BADGE).map(([status, cls]) => (
            <span key={status} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{status}</span>
          ))}
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Nova Ausência</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ID do Colaborador</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {TYPES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {[["Início", "start_date"], ["Fim", "end_date"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.keys(STATUS_BADGE).map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
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

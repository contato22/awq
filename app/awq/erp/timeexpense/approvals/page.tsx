"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Receipt } from "lucide-react";
import type { ErpExpense } from "@/lib/erp-db";

type TimeEntry = {
  entry_id: string; user_id: string; project_id: string;
  entry_date: string; hours: number; description: string; status: string;
};

export default function TimeExpenseApprovalsPage() {
  const [timesheets, setTimesheets] = useState<TimeEntry[]>([]);
  const [expenses, setExpenses] = useState<ErpExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ppm/time-entries?status=submitted").then(r => r.json()),
      fetch("/api/erp/expenses").then(r => r.json()),
    ]).then(([te, exp]) => {
      setTimesheets(te.data ?? []);
      setExpenses((exp.data ?? []).filter((e: ErpExpense) => e.status === "Submetido"));
      setLoading(false);
    });
  }, []);

  async function approveTimesheet(entry_id: string) {
    await fetch("/api/ppm/time-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", entry_id, approved_by: "Aprovador" }) });
    setTimesheets(p => p.filter(t => t.entry_id !== entry_id));
  }

  async function rejectTimesheet(entry_id: string) {
    await fetch("/api/ppm/time-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", entry_id, approved_by: "", status: "rejected" }) });
    setTimesheets(p => p.filter(t => t.entry_id !== entry_id));
  }

  async function approveExpense(id: string) {
    await fetch("/api/erp/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "Aprovado" }) });
    setExpenses(p => p.filter(e => e.id !== id));
  }

  async function rejectExpense(id: string) {
    await fetch("/api/erp/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "Rejeitado" }) });
    setExpenses(p => p.filter(e => e.id !== id));
  }

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
          <div><h1 className="text-lg font-bold text-gray-900">Aprovações de Time & Expense</h1><p className="text-xs text-gray-500">ERP · Time & Expense</p></div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-8">
        <section className="space-y-3">
          <div className="flex items-center gap-2"><Clock size={16} className="text-blue-600" /><h2 className="text-sm font-bold text-gray-800">Timesheets Pendentes</h2>{!loading && timesheets.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{timesheets.length}</span>}</div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50"><tr>{["Colaborador", "Projeto", "Data", "Horas", "Descrição", "Ações"].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Carregando...</td></tr>
                  : timesheets.length === 0 ? <tr><td colSpan={6} className="px-4 py-12"><div className="flex flex-col items-center gap-2 text-center"><Clock size={28} className="text-gray-200" /><p className="text-sm text-gray-400">Nenhum timesheet pendente de aprovação</p></div></td></tr>
                  : timesheets.map(t => (
                    <tr key={t.entry_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{t.user_id}</td>
                      <td className="px-4 py-3 text-gray-600">{t.project_id}</td>
                      <td className="px-4 py-3 text-gray-500">{t.entry_date ? new Date(t.entry_date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{t.hours}h</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{t.description || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => approveTimesheet(t.entry_id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><CheckCircle2 size={15} /></button>
                          <button onClick={() => rejectTimesheet(t.entry_id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors"><XCircle size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2"><Receipt size={16} className="text-blue-600" /><h2 className="text-sm font-bold text-gray-800">Despesas Pendentes</h2>{!loading && expenses.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{expenses.length}</span>}</div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50"><tr>{["Colaborador", "Categoria", "Data", "Total", "Descrição", "Ações"].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Carregando...</td></tr>
                  : expenses.length === 0 ? <tr><td colSpan={6} className="px-4 py-12"><div className="flex flex-col items-center gap-2 text-center"><Receipt size={28} className="text-gray-200" /><p className="text-sm text-gray-400">Nenhuma despesa pendente de aprovação</p></div></td></tr>
                  : expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.employee}</td>
                      <td className="px-4 py-3 text-gray-600">{e.category}</td>
                      <td className="px-4 py-3 text-gray-500">{e.date ? new Date(e.date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmt(e.amount ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{e.description || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => approveExpense(e.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><CheckCircle2 size={15} /></button>
                          <button onClick={() => rejectExpense(e.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors"><XCircle size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /><span>Aprovar</span></div>
            <div className="flex items-center gap-1"><XCircle size={12} className="text-red-400" /><span>Rejeitar</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

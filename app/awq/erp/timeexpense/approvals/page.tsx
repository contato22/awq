"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Receipt, Search } from "lucide-react";
import type { ExpenseReport } from "@/lib/erp-db";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORY_BADGE: Record<string, string> = {
  Viagem:      "bg-blue-100 text-blue-700",
  Refeição:    "bg-amber-100 text-amber-700",
  Hospedagem:  "bg-purple-100 text-purple-700",
  Transporte:  "bg-sky-100 text-sky-700",
  Outros:      "bg-gray-100 text-gray-600",
};

export default function TimeExpenseApprovalsPage() {
  const [items, setItems] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/erp/expenses")
      .then((r) => r.json())
      .then((j) => { if (j.success) setItems(j.data.filter((e: ExpenseReport) => e.status === "Submetido")); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((e) => {
    const q = search.toLowerCase();
    return e.employee.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
  });

  const totalPending = filtered.reduce((s, e) => s + e.value, 0);

  const handleApprove = (item: ExpenseReport) => {
    fetch("/api/awq/erp/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", expense: { ...item, status: "Aprovado" } }),
    })
      .then(() => setItems((prev) => prev.filter((x) => x.id !== item.id)))
      .catch(() => {});
  };

  const handleReject = (item: ExpenseReport) => {
    fetch("/api/awq/erp/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", expense: { ...item, status: "Rejeitado" } }),
    })
      .then(() => setItems((prev) => prev.filter((x) => x.id !== item.id)))
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Aprovações de Time & Expense</h1>
            <p className="text-xs text-gray-500">ERP · Time & Expense</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-8">

        {/* Timesheets Pendentes */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand-600" />
            <h2 className="text-sm font-bold text-gray-800">Timesheets Pendentes</h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Colaborador", "Data Submissão", "Total Horas", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td colSpan={4} className="px-4 py-12">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Clock size={28} className="text-gray-200" />
                        <p className="text-sm text-gray-400">Nenhum timesheet pendente de aprovação</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Despesas Pendentes */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-brand-600" />
            <h2 className="text-sm font-bold text-gray-800">Despesas Pendentes</h2>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Aguardando Aprovação</div>
              <div className="text-2xl font-bold text-amber-600">{loading ? "—" : filtered.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Total Pendente</div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "—" : fmtBRL(totalPending)}</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar colaborador ou descrição…"
              className="flex-1 text-sm focus:outline-none bg-transparent"
            />
          </div>

          {loading ? (
            <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Data", "Colaborador", "Categoria", "Descrição", "Valor", "BU", "Ações"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12">
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Receipt size={28} className="text-gray-200" />
                            <p className="text-sm text-gray-400">Nenhuma despesa pendente de aprovação</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{item.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.employee}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_BADGE[item.category] ?? "bg-gray-100 text-gray-600"}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate">{item.description}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap tabular-nums font-medium">{fmtBRL(item.value)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{item.bu}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(item)}
                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                                title="Aprovar"
                              >
                                <CheckCircle2 size={14} /> Aprovar
                              </button>
                              <button
                                onClick={() => handleReject(item)}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                                title="Rejeitar"
                              >
                                <XCircle size={14} /> Rejeitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>Aprovar</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle size={12} className="text-red-400" />
              <span>Rejeitar</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

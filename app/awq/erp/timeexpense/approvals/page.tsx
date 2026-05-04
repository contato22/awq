"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Receipt } from "lucide-react";

export default function TimeExpenseApprovalsPage() {
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Colaborador", "Data Submissão", "Total", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td colSpan={4} className="px-4 py-12">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Receipt size={28} className="text-gray-200" />
                        <p className="text-sm text-gray-400">Nenhuma despesa pendente de aprovação</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

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

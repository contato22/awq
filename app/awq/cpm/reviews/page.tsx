"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import type { PerformanceReview } from "@/lib/cpm-db";

const TYPE_BADGE: Record<string, string> = {
  quarterly: "bg-blue-100 text-blue-700",
  annual:    "bg-purple-100 text-purple-700",
  monthly:   "bg-gray-100 text-gray-600",
};

const STATUS_BADGE: Record<string, string> = {
  "Agendada":  "bg-blue-100 text-blue-700",
  "Realizada": "bg-emerald-100 text-emerald-700",
  "Cancelada": "bg-red-100 text-red-700",
};

export default function ReviewsPage() {
  const [items, setItems] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/cpm/reviews")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total      = items.length;
  const realizadas = items.filter(r => r.status === "Realizada").length;
  const agendadas  = items.filter(r => r.status === "Agendada").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/cpm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <ClipboardList size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Reviews</h1>
            <p className="text-xs text-gray-500">CPM · Revisões de Performance</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total Revisões</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Realizadas</p>
              <p className="text-2xl font-bold text-emerald-600">{realizadas}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Agendadas</p>
              <p className="text-2xl font-bold text-blue-600">{agendadas}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Revisão</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Período</th>
                  <th className="text-left px-4 py-3">Facilitador</th>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Participantes</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  items.map(rev => (
                    <tr key={rev.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{rev.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[rev.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {rev.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{rev.period}</td>
                      <td className="px-4 py-3 text-gray-600">{rev.facilitator}</td>
                      <td className="px-4 py-3 text-gray-600">{rev.date}</td>
                      <td className="px-4 py-3 text-gray-600">{rev.participants}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rev.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {rev.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

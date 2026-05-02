"use client";

// ─── /awq/bpm/analytics/performance — Process Performance ─────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { ProcessPerformance } from "@/lib/bpm-types";

const CATEGORY_COLORS: Record<string, string> = {
  procurement:        "bg-blue-50 text-blue-700",
  finance:            "bg-green-50 text-green-700",
  legal:              "bg-purple-50 text-purple-700",
  project_management: "bg-orange-50 text-orange-700",
};

export default function BpmPerformancePage() {
  const [data, setData]     = useState<ProcessPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/bpm/analytics?view=performance");
        const json = await res.json();
        if (json.success) setData(json.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totals = data.reduce((acc, d) => ({
    total:    acc.total    + d.total_instances,
    approved: acc.approved + d.approved_count,
    rejected: acc.rejected + d.rejected_count,
    active:   acc.active   + d.in_progress_count,
    breaches: acc.breaches + d.sla_breaches,
  }), { total: 0, approved: 0, rejected: 0, active: 0, breaches: 0 });

  const overallRate = totals.total > 0
    ? Math.round((totals.approved / Math.max(totals.approved + totals.rejected, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/awq/bpm/tasks" className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Performance dos Processos</h1>
              <p className="text-sm text-gray-500">Últimos 90 dias · Cycle time · Approval rate · SLA compliance</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/awq/bpm/analytics/sla" className="text-sm text-blue-600 hover:underline">SLA Dashboard</Link>
            <Link href="/awq/bpm/analytics/bottlenecks" className="text-sm text-blue-600 hover:underline">Bottlenecks</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard label="Total Processos" value={totals.total}      color="text-gray-800" icon={<BarChart3 className="h-5 w-5 text-gray-400" />} />
          <KpiCard label="Em Andamento"    value={totals.active}     color="text-blue-600" icon={<Clock className="h-5 w-5 text-blue-400" />} />
          <KpiCard label="Aprovados"       value={totals.approved}   color="text-green-600" icon={<CheckCircle2 className="h-5 w-5 text-green-400" />} />
          <KpiCard label="Rejeitados"      value={totals.rejected}   color="text-red-600"  icon={<XCircle className="h-5 w-5 text-red-400" />} />
          <KpiCard label="Approval Rate"   value={`${overallRate}%`} color="text-purple-600" icon={<TrendingUp className="h-5 w-5 text-purple-400" />} />
        </div>

        {/* Per-process table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Performance por Processo</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /></div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Nenhum dado disponível. Inicie workflows para ver analytics.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Processo", "Categoria", "Total", "Aprovados", "Rejeitados", "Em Andamento", "Approval Rate", "Cycle Time (avg)", "SLA Compliance"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map((row) => (
                    <tr key={row.process_code} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{row.process_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{row.process_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[row.process_category] ?? "bg-gray-100 text-gray-600"}`}>
                          {row.process_category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.total_instances}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">{row.approved_count}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">{row.rejected_count}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">{row.in_progress_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${row.approval_rate_pct}%` }} />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-10 text-right">{row.approval_rate_pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.avg_cycle_time_hours !== null ? `${row.avg_cycle_time_hours}h` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${row.sla_compliance_pct >= 90 ? "bg-green-500" : row.sla_compliance_pct >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${row.sla_compliance_pct}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium w-10 text-right ${row.sla_compliance_pct >= 90 ? "text-green-600" : row.sla_compliance_pct >= 70 ? "text-yellow-600" : "text-red-600"}`}>
                            {row.sla_compliance_pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      {icon}
      <div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

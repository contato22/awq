"use client";

// ─── /awq/bpm/analytics/bottlenecks — Bottleneck Analysis ─────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, AlertTriangle, Loader2, Activity } from "lucide-react";
import type { BottleneckRow } from "@/lib/bpm-types";

export default function BpmBottlenecksPage() {
  const [data, setData]       = useState<BottleneckRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/bpm/analytics?view=bottlenecks");
        const json = await res.json();
        if (json.success) setData(json.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxAvg = Math.max(...data.map((d) => d.avg_time_hours ?? 0), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/awq/bpm/analytics/performance" className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Análise de Bottlenecks</h1>
              <p className="text-sm text-gray-500">Steps que mais atrasam aprovações — últimos 90 dias</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/awq/bpm/analytics/performance" className="text-sm text-blue-600 hover:underline">Performance</Link>
            <Link href="/awq/bpm/analytics/sla" className="text-sm text-blue-600 hover:underline">SLA Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /> Carregando análise...
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Activity className="h-12 w-12 text-blue-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Dados insuficientes</p>
            <p className="text-gray-400 text-sm mt-1">Complete alguns workflows para ver a análise de bottlenecks.</p>
          </div>
        ) : (
          <>
            {/* Horizontal bar chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-5">Tempo Médio por Step (horas)</h2>
              <div className="space-y-3">
                {data.slice(0, 10).map((row) => (
                  <div key={`${row.process_code}-${row.step_name}`} className="flex items-center gap-4">
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{row.step_name}</div>
                      <div className="text-xs text-gray-400">{row.process_code}</div>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            (row.avg_time_hours ?? 0) > maxAvg * 0.7 ? "bg-red-500" :
                            (row.avg_time_hours ?? 0) > maxAvg * 0.4 ? "bg-orange-400" : "bg-blue-500"
                          }`}
                          style={{ width: `${((row.avg_time_hours ?? 0) / maxAvg) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                        {row.avg_time_hours !== null ? `${row.avg_time_hours}h` : "—"}
                      </span>
                    </div>
                    {row.breach_count > 0 && (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                        <AlertTriangle className="h-3 w-3" /> {row.breach_count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Detail Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Detalhe por Step</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Step", "Processo", "Tarefas", "Tempo Médio", "Mediana", "Breaches"].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map((row) => (
                      <tr key={`${row.process_code}-${row.step_name}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.step_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{row.process_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.task_count}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${
                            (row.avg_time_hours ?? 0) > 72 ? "text-red-600" :
                            (row.avg_time_hours ?? 0) > 48 ? "text-orange-600" : "text-gray-700"
                          }`}>
                            {row.avg_time_hours !== null ? `${row.avg_time_hours}h` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.median_time_hours !== null ? `${row.median_time_hours}h` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.breach_count > 0 ? (
                            <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                              <AlertTriangle className="h-3.5 w-3.5" /> {row.breach_count}
                            </span>
                          ) : (
                            <span className="text-green-600 text-sm">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            {data.some((d) => (d.avg_time_hours ?? 0) > 72) && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Recomendações
                </h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  {data.filter((d) => (d.avg_time_hours ?? 0) > 72).slice(0, 3).map((d) => (
                    <li key={`${d.process_code}-${d.step_name}`}>
                      • <strong>{d.step_name}</strong> ({d.process_code}): tempo médio de {d.avg_time_hours}h — considere reduzir o SLA target ou delegar a aprovação.
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

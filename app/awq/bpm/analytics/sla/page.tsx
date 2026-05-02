"use client";

// ─── /awq/bpm/analytics/sla — SLA Dashboard ────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, Loader2, Shield } from "lucide-react";
import type { SlaDashboardRow } from "@/lib/bpm-types";

export default function BpmSlaDashboardPage() {
  const [data, setData]     = useState<SlaDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/bpm/analytics?view=sla");
        const json = await res.json();
        if (json.success) setData(json.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalBreached = data.reduce((s, d) => s + d.breached_tasks, 0);
  const totalAtRisk   = data.reduce((s, d) => s + d.at_risk_tasks, 0);
  const totalActive   = data.reduce((s, d) => s + d.active_tasks, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/awq/bpm/analytics/performance" className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SLA Dashboard</h1>
              <p className="text-sm text-gray-500">Tarefas ativas · breaches · em risco</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/awq/bpm/analytics/performance" className="text-sm text-blue-600 hover:underline">Performance</Link>
            <Link href="/awq/bpm/analytics/bottlenecks" className="text-sm text-blue-600 hover:underline">Bottlenecks</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            label="Tarefas Ativas"
            value={totalActive}
            color="text-blue-600"
            bgColor="bg-blue-50"
            icon={<Clock className="h-6 w-6 text-blue-500" />}
          />
          <SummaryCard
            label="SLA Breaches"
            value={totalBreached}
            color="text-red-600"
            bgColor="bg-red-50"
            icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
            note={totalBreached > 0 ? "Ação imediata necessária" : "Tudo em dia ✓"}
          />
          <SummaryCard
            label="Em Risco (próx. 24h)"
            value={totalAtRisk}
            color="text-orange-600"
            bgColor="bg-orange-50"
            icon={<Shield className="h-6 w-6 text-orange-500" />}
          />
        </div>

        {/* Per-process SLA */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">SLA por Processo</h2>
            <span className="text-xs text-gray-400">Últimos 30 dias</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /></div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma tarefa ativa no momento. Tudo em dia!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Processo", "Tarefas Ativas", "SLA Breaches", "Em Risco (24h)", "Tempo Médio de Resposta", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map((row) => {
                    const healthOk = row.breached_tasks === 0 && row.at_risk_tasks === 0;
                    const healthWarn = row.at_risk_tasks > 0 && row.breached_tasks === 0;
                    return (
                      <tr key={row.process_code} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{row.process_name}</div>
                          <div className="text-xs text-gray-400 font-mono">{row.process_code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600">{row.active_tasks}</td>
                        <td className="px-4 py-3">
                          {row.breached_tasks > 0 ? (
                            <span className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                              <AlertTriangle className="h-3.5 w-3.5" /> {row.breached_tasks}
                            </span>
                          ) : (
                            <span className="text-green-600 text-sm">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.at_risk_tasks > 0 ? (
                            <span className="text-orange-600 text-sm font-semibold">{row.at_risk_tasks}</span>
                          ) : (
                            <span className="text-green-600 text-sm">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.avg_response_hours !== null ? `${row.avg_response_hours}h` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            healthOk ? "bg-green-100 text-green-700" :
                            healthWarn ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {healthOk ? "✓ OK" : healthWarn ? "⚠ Risco" : "✗ Breach"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SLA Tips */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">SLA Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-800 mb-1">PO / Expense / AP</div>
              <div>Manager: 24h · Finance/CFO: 48h · CEO: 72h</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-800 mb-1">Budget Approval</div>
              <div>BU Lead: 72h · CFO: 96h · CEO: 120h (total: 10d)</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-800 mb-1">Contract / Kickoff</div>
              <div>Legal: 96h · Finance: 48h · CEO: 72h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, bgColor, icon, note }: {
  label: string; value: number; color: string; bgColor: string; icon: React.ReactNode; note?: string;
}) {
  return (
    <div className={`rounded-xl border p-5 flex items-start gap-4 ${bgColor} border-opacity-50`} style={{ borderColor: "transparent" }}>
      <div>{icon}</div>
      <div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
        {note && <div className="text-xs text-gray-500 mt-1">{note}</div>}
      </div>
    </div>
  );
}

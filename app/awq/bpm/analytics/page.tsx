"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import {
  localGetPerformance,
  localGetBottlenecks,
  localCheckSlaBreaches,
  localListInstances,
} from "@/lib/bpm-local";
import type { ProcessPerformance, BottleneckStep } from "@/lib/bpm-types";

function pct(n: number) { return `${n.toFixed(1)}%`; }
function fmtN(n: number | null) { return n == null ? "—" : n.toFixed(1); }

function ProgressBar({ value, max, cls }: { value: number; max: number; cls: string }) {
  const pctVal = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${cls}`} style={{ width: `${pctVal}%` }} />
    </div>
  );
}

export default function BpmAnalyticsPage() {
  const [performance, setPerformance] = useState<ProcessPerformance[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckStep[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    localCheckSlaBreaches();
    setPerformance(localGetPerformance());
    setBottlenecks(localGetBottlenecks());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const instances = localListInstances();
  const slaBreached = instances.filter((i) => i.sla_breached).length;
  const slaOk = instances.length - slaBreached;
  const slaRate = instances.length > 0 ? (slaOk / instances.length) * 100 : 100;

  const totalApproved  = performance.reduce((s, p) => s + p.approved_count,   0);
  const totalRejected  = performance.reduce((s, p) => s + p.rejected_count,   0);
  const totalInstances = performance.reduce((s, p) => s + p.total_instances,  0);
  const overallApprovalRate = totalApproved + totalRejected > 0
    ? (totalApproved / (totalApproved + totalRejected)) * 100
    : 0;

  return (
    <>
      <Header
        title="BPM Analytics"
        subtitle="Performance de processos · SLA compliance · Bottlenecks"
      />
      <div className="page-container space-y-6">

        {/* ── Summary KPIs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total instâncias", value: String(totalInstances), icon: GitBranch, cls: "text-gray-600" },
            { label: "Taxa aprovação",   value: pct(overallApprovalRate), icon: CheckCircle2, cls: "text-green-600" },
            { label: "SLA compliance",   value: pct(slaRate), icon: Clock, cls: slaRate >= 90 ? "text-green-600" : "text-orange-600" },
            { label: "SLA breaches",     value: String(slaBreached), icon: AlertTriangle, cls: "text-red-600" },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`flex items-center gap-2 ${cls} mb-1`}>
                <Icon size={15} />
                <span className="text-[11px] font-semibold uppercase">{label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>

        {/* ── Process performance ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" /> Performance por Processo (90 dias)
          </h2>

          {performance.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum dado disponível ainda.</p>
              <p className="text-xs mt-1">Inicie workflows pelo catálogo de processos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-2 text-left font-semibold">Processo</th>
                    <th className="pb-2 text-right font-semibold">Total</th>
                    <th className="pb-2 text-right font-semibold">Aprovados</th>
                    <th className="pb-2 text-right font-semibold">Rejeitados</th>
                    <th className="pb-2 text-right font-semibold">Em andamento</th>
                    <th className="pb-2 text-right font-semibold">Taxa aprovação</th>
                    <th className="pb-2 text-right font-semibold">SLA compliance</th>
                    <th className="pb-2 text-right font-semibold">Breaches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {performance.map((p) => (
                    <tr key={p.process_code} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-gray-800 text-xs">{p.process_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{p.process_code}</div>
                      </td>
                      <td className="py-3 text-right text-xs font-bold text-gray-900">{p.total_instances}</td>
                      <td className="py-3 text-right text-xs text-green-700 font-semibold">{p.approved_count}</td>
                      <td className="py-3 text-right text-xs text-red-600 font-semibold">{p.rejected_count}</td>
                      <td className="py-3 text-right text-xs text-blue-600">{p.in_progress_count}</td>
                      <td className="py-3 text-right">
                        <div className="text-xs font-semibold text-gray-700">{pct(p.approval_rate)}</div>
                        <ProgressBar value={p.approval_rate} max={100} cls="bg-green-400" />
                      </td>
                      <td className="py-3 text-right">
                        <div className={`text-xs font-semibold ${p.sla_compliance_rate >= 90 ? "text-green-700" : "text-orange-600"}`}>
                          {pct(p.sla_compliance_rate)}
                        </div>
                        <ProgressBar value={p.sla_compliance_rate} max={100} cls={p.sla_compliance_rate >= 90 ? "bg-green-400" : "bg-orange-400"} />
                      </td>
                      <td className="py-3 text-right text-xs text-red-600 font-semibold">{p.sla_breaches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── SLA dashboard ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-orange-600" /> SLA Dashboard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${slaRate >= 90 ? "bg-green-50 border-green-200" : slaRate >= 70 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"}`}>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Compliance geral</div>
              <div className={`text-3xl font-bold ${slaRate >= 90 ? "text-green-700" : slaRate >= 70 ? "text-orange-700" : "text-red-700"}`}>
                {pct(slaRate)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{slaOk} de {instances.length} instâncias dentro do SLA</div>
            </div>

            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">SLA Breaches</div>
              <div className="text-3xl font-bold text-red-700">{slaBreached}</div>
              <div className="text-xs text-gray-500 mt-1">processos com SLA vencido</div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Em andamento</div>
              <div className="text-3xl font-bold text-gray-900">
                {instances.filter((i) => ["pending", "in_progress"].includes(i.status)).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">workflows ativos</div>
            </div>
          </div>
        </div>

        {/* ── Bottleneck analysis ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-600" /> Análise de Gargalos
          </h2>

          {bottlenecks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Dados insuficientes para análise de gargalos.</p>
              <p className="text-xs mt-1">Execute alguns workflows para ver onde ocorrem atrasos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-2 text-left font-semibold">Processo</th>
                    <th className="pb-2 text-left font-semibold">Step</th>
                    <th className="pb-2 text-right font-semibold">Tarefas</th>
                    <th className="pb-2 text-right font-semibold">Tempo médio</th>
                    <th className="pb-2 text-right font-semibold">SLA breaches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bottlenecks.sort((a, b) => b.breach_count - a.breach_count).map((b, i) => (
                    <tr key={`${b.process_code}-${b.step_name}`} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-3 text-xs font-mono text-gray-500">{b.process_code}</td>
                      <td className="py-2.5 pr-3 text-xs font-semibold text-gray-800">{b.step_name}</td>
                      <td className="py-2.5 text-right text-xs text-gray-700">{b.task_count}</td>
                      <td className="py-2.5 text-right text-xs text-gray-500">{fmtN(b.avg_time_hours)}h</td>
                      <td className="py-2.5 text-right">
                        <span className={`text-xs font-bold ${b.breach_count > 0 ? "text-red-600" : "text-green-600"}`}>
                          {b.breach_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Process distribution ─────────────────────────────────────────── */}
        {performance.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <GitBranch size={16} className="text-blue-600" /> Distribuição de Instâncias
            </h2>
            <div className="space-y-3">
              {performance.map((p) => {
                const barW = totalInstances > 0 ? (p.total_instances / totalInstances) * 100 : 0;
                return (
                  <div key={p.process_code}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{p.process_name}</span>
                      <span className="text-gray-500">{p.total_instances} ({pct(barW)})</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barW}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

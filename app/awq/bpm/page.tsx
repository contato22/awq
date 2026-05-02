"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  GitBranch,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  BarChart3,
  ListTodo,
  Layers,
  TrendingUp,
  Plus,
  ArrowRight,
  Building2,
} from "lucide-react";
import {
  localListInstances,
  localBuildWorkQueue,
  localCheckSlaBreaches,
  localListNotifications,
} from "@/lib/bpm-local";
import { PROCESS_DEFINITIONS } from "@/lib/bpm-process-definitions";
import type { ProcessInstance, BpmNotification } from "@/lib/bpm-types";

const CURRENT_USER = "miguel";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved:   "bg-green-100 text-green-800",
    rejected:   "bg-red-100 text-red-800",
    in_progress: "bg-blue-100 text-blue-800",
    pending:    "bg-yellow-100 text-yellow-800",
    cancelled:  "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    approved:   "Aprovado",
    rejected:   "Rejeitado",
    in_progress: "Em andamento",
    pending:    "Pendente",
    cancelled:  "Cancelado",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function BpmDashboardPage() {
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    localCheckSlaBreaches();
    const all = localListInstances();
    setInstances(all.slice(0, 10));

    const queue = localBuildWorkQueue(CURRENT_USER);
    setTaskCount(queue.length);
    setOverdueCount(queue.filter((t) => t.sla_breached).length);

    const notifs = localListNotifications(CURRENT_USER, true);
    setUnreadNotifs(notifs.length);
  }, []);

  const approvedCount   = instances.filter((i) => i.status === "approved").length;
  const rejectedCount   = instances.filter((i) => i.status === "rejected").length;
  const inProgressCount = instances.filter((i) => ["pending", "in_progress"].includes(i.status)).length;

  return (
    <>
      <Header
        title="BPM — Control Tower"
        subtitle="Business Process Management · Aprovações e workflows"
      />
      <div className="page-container space-y-6">

        {/* ── Quick stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <ListTodo size={16} />
              <span className="text-xs font-semibold uppercase">Minhas tarefas</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{taskCount}</div>
            {overdueCount > 0 && (
              <div className="text-xs text-red-600 mt-1 font-medium">{overdueCount} vencida{overdueCount > 1 ? "s" : ""}</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock size={16} />
              <span className="text-xs font-semibold uppercase">Em andamento</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{inProgressCount}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle2 size={16} />
              <span className="text-xs font-semibold uppercase">Aprovados (90d)</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{approvedCount}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle size={16} />
              <span className="text-xs font-semibold uppercase">Notificações</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{unreadNotifs}</div>
            <div className="text-xs text-gray-500 mt-1">não lidas</div>
          </div>
        </div>

        {/* ── Quick links ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/awq/bpm/tasks", label: "Fila de aprovações", icon: ListTodo, color: "text-blue-600 bg-blue-50 border-blue-200", badge: taskCount > 0 ? String(taskCount) : undefined },
            { href: "/awq/bpm/instances", label: "Instâncias ativas", icon: Layers, color: "text-purple-600 bg-purple-50 border-purple-200" },
            { href: "/awq/bpm/analytics", label: "Analytics & SLA", icon: BarChart3, color: "text-green-600 bg-green-50 border-green-200" },
            { href: "/awq/bpm/processes", label: "Catálogo de processos", icon: GitBranch, color: "text-orange-600 bg-orange-50 border-orange-200", badge: String(PROCESS_DEFINITIONS.length) },
          ].map(({ href, label, icon: Icon, color, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between p-4 rounded-xl border ${color} hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                {badge && (
                  <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full">{badge}</span>
                )}
                <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Process catalogue summary ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">6 Workflows Configurados</h2>
            <Link href="/awq/bpm/processes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROCESS_DEFINITIONS.map((pd) => (
              <div key={pd.process_code} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <GitBranch size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-800">{pd.process_name}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{pd.description}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {pd.workflow_steps.length} step{pd.workflow_steps.length > 1 ? "s" : ""} · SLA {pd.default_sla_hours}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent instances ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Instâncias Recentes</h2>
            <Link href="/awq/bpm/instances" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          {instances.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <GitBranch size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum processo iniciado ainda.</p>
              <Link
                href="/awq/bpm/processes"
                className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 hover:underline"
              >
                <Plus size={12} /> Iniciar um workflow
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] text-gray-500 uppercase">
                    <th className="pb-2 text-left font-semibold">Código</th>
                    <th className="pb-2 text-left font-semibold">Processo</th>
                    <th className="pb-2 text-left font-semibold">Entidade</th>
                    <th className="pb-2 text-left font-semibold">Status</th>
                    <th className="pb-2 text-left font-semibold">Step atual</th>
                    <th className="pb-2 text-left font-semibold">Iniciado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {instances.map((inst) => (
                    <tr key={inst.instance_id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <Link href={`/awq/bpm/instances/${inst.instance_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                          {inst.instance_code}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-700">{inst.process_name}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 size={11} />
                          {inst.related_entity_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{statusBadge(inst.status)}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{inst.current_step_name ?? "—"}</td>
                      <td className="py-2 text-xs text-gray-400">{fmtDate(inst.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}

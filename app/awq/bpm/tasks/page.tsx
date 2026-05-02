"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  ListTodo,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Building2,
  User,
} from "lucide-react";
import {
  localBuildWorkQueue,
  localCheckSlaBreaches,
} from "@/lib/bpm-local";
import type { WorkQueueItem, Priority } from "@/lib/bpm-types";

const CURRENT_USER = "miguel";

type Filter = "all" | "overdue" | "today" | "upcoming";

function fmtCurrency(v: unknown) {
  const n = Number(v);
  if (!n) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtSla(item: WorkQueueItem) {
  if (item.sla_breached) return { label: "Vencida", cls: "text-red-600 font-bold" };
  const h = item.sla_hours_remaining ?? 0;
  if (h < 0) return { label: "Vencida", cls: "text-red-600 font-bold" };
  if (h < 24) return { label: `${Math.round(h)}h restantes`, cls: "text-orange-600 font-semibold" };
  const d = Math.floor(h / 24);
  return { label: `${d}d restantes`, cls: "text-gray-500" };
}

const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-800",
  high:   "bg-orange-100 text-orange-800",
  normal: "bg-blue-100 text-blue-800",
  low:    "bg-gray-100 text-gray-600",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgente",
  high:   "Alta",
  normal: "Normal",
  low:    "Baixa",
};

function taskEntitySummary(item: WorkQueueItem) {
  const d = item.request_data;
  if (d.supplier_name) return `${d.supplier_name} — ${fmtCurrency(d.amount)}`;
  if (d.amount)        return fmtCurrency(d.amount);
  if (d.description)   return String(d.description).slice(0, 60);
  if (d.contract_name) return String(d.contract_name).slice(0, 60);
  if (d.project_name)  return String(d.project_name).slice(0, 60);
  if (d.budget_name)   return String(d.budget_name).slice(0, 60);
  return item.related_entity_type;
}

export default function BpmTasksPage() {
  const [all, setAll] = useState<WorkQueueItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    localCheckSlaBreaches();
    const queue = localBuildWorkQueue(CURRENT_USER);
    setAll(queue);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (() => {
    const now = new Date();
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    switch (filter) {
      case "overdue":  return all.filter((t) => t.sla_breached);
      case "today":    return all.filter((t) => new Date(t.sla_due_date) <= todayEnd);
      case "upcoming": return all.filter((t) => !t.sla_breached && new Date(t.sla_due_date) > todayEnd);
      default:         return all;
    }
  })();

  const stats = {
    total:    all.length,
    overdue:  all.filter((t) => t.sla_breached).length,
    today:    all.filter((t) => {
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      return new Date(t.sla_due_date) <= todayEnd && !t.sla_breached;
    }).length,
    week:     all.filter((t) => new Date(t.sla_due_date) <= new Date(Date.now() + 7 * 864e5)).length,
  };

  return (
    <>
      <Header
        title="Fila de Aprovações"
        subtitle="Tarefas pendentes de revisão e aprovação"
      />
      <div className="page-container space-y-6">

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total,   icon: ListTodo,    cls: "text-blue-600"   },
            { label: "Vencidas", value: stats.overdue, icon: AlertTriangle, cls: "text-red-600" },
            { label: "Vence hoje", value: stats.today, icon: Clock,    cls: "text-orange-600" },
            { label: "Esta semana", value: stats.week, icon: Calendar, cls: "text-purple-600" },
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

        {/* ── Filters ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "overdue", "today", "upcoming"] as Filter[]).map((f) => {
            const labels: Record<Filter, string> = { all: "Todas", overdue: "Vencidas", today: "Hoje", upcoming: "Próximas" };
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {labels[f]} {f === "all" ? `(${stats.total})` : f === "overdue" ? `(${stats.overdue})` : ""}
              </button>
            );
          })}
          <button
            onClick={load}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* ── Task list ─────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma tarefa pendente</p>
            <p className="text-xs text-gray-400 mt-1">Você está em dia!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[11px] text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left font-semibold">Processo / Código</th>
                  <th className="px-4 py-3 text-left font-semibold">Step</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalhes</th>
                  <th className="px-4 py-3 text-left font-semibold">Iniciado por</th>
                  <th className="px-4 py-3 text-left font-semibold">SLA</th>
                  <th className="px-4 py-3 text-left font-semibold">Prioridade</th>
                  <th className="px-4 py-3 text-left font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => {
                  const sla = fmtSla(item);
                  return (
                    <tr
                      key={item.task_id}
                      className={`hover:bg-gray-50 transition-colors ${item.sla_breached ? "bg-red-50/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 text-xs">{item.process_name}</div>
                        <div className="font-mono text-[11px] text-gray-400">{item.instance_code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{item.step_name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                        <div className="flex items-center gap-1">
                          <Building2 size={11} className="shrink-0" />
                          {taskEntitySummary(item)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User size={11} />
                          {item.initiated_by_name}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-xs ${sla.cls}`}>{sla.label}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${PRIORITY_BADGE[item.priority]}`}>
                          {PRIORITY_LABELS[item.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/awq/bpm/tasks/${item.task_id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Revisar <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  GitBranch,
  Building2,
} from "lucide-react";
import { localListInstances, localCheckSlaBreaches } from "@/lib/bpm-local";
import type { ProcessInstance, InstanceStatus } from "@/lib/bpm-types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtCurrency(v: unknown) {
  const n = Number(v);
  if (!n) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const STATUS_CONFIG: Record<InstanceStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  approved:   { label: "Aprovado",     cls: "bg-green-100 text-green-800",  icon: <CheckCircle2 size={11} /> },
  rejected:   { label: "Rejeitado",    cls: "bg-red-100 text-red-800",     icon: <XCircle size={11} /> },
  in_progress:{ label: "Em andamento", cls: "bg-blue-100 text-blue-800",   icon: <Clock size={11} /> },
  pending:    { label: "Pendente",     cls: "bg-yellow-100 text-yellow-800", icon: <Clock size={11} /> },
  cancelled:  { label: "Cancelado",   cls: "bg-gray-100 text-gray-500",    icon: <XCircle size={11} /> },
};

type FilterStatus = InstanceStatus | "all";

export default function BpmInstancesPage() {
  const [all, setAll] = useState<ProcessInstance[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    localCheckSlaBreaches();
    setAll(localListInstances());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = all.filter((inst) => {
    if (filter !== "all" && inst.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inst.instance_code.toLowerCase().includes(q) ||
        inst.process_name.toLowerCase().includes(q) ||
        inst.related_entity_type.toLowerCase().includes(q) ||
        JSON.stringify(inst.request_data).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all:        all.length,
    in_progress: all.filter((i) => i.status === "in_progress").length,
    approved:   all.filter((i) => i.status === "approved").length,
    rejected:   all.filter((i) => i.status === "rejected").length,
    cancelled:  all.filter((i) => i.status === "cancelled").length,
  };

  return (
    <>
      <Header
        title="Instâncias de Processo"
        subtitle="Histórico e status de todos os workflows iniciados"
      />
      <div className="page-container space-y-6">

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Em andamento", value: counts.in_progress, icon: Clock,        cls: "text-blue-600" },
            { label: "Aprovados",    value: counts.approved,    icon: CheckCircle2, cls: "text-green-600" },
            { label: "Rejeitados",   value: counts.rejected,    icon: XCircle,      cls: "text-red-600" },
            { label: "Total",        value: counts.all,         icon: Layers,       cls: "text-gray-600" },
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

        {/* ── Filters + search ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {(["all", "in_progress", "approved", "rejected", "cancelled"] as FilterStatus[]).map((f) => {
              const labels: Record<FilterStatus, string> = { all: "Todas", in_progress: "Ativas", approved: "Aprovadas", rejected: "Rejeitadas", cancelled: "Canceladas" };
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, processo..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Atualizar">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <GitBranch size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500">
              {all.length === 0 ? "Nenhum processo iniciado ainda." : "Nenhuma instância encontrada."}
            </p>
            {all.length === 0 && (
              <Link href="/awq/bpm/processes" className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 hover:underline">
                Ir para catálogo de processos <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[11px] text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left font-semibold">Código</th>
                  <th className="px-4 py-3 text-left font-semibold">Processo</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalhes</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Step atual</th>
                  <th className="px-4 py-3 text-left font-semibold">Iniciado</th>
                  <th className="px-4 py-3 text-left font-semibold">SLA</th>
                  <th className="px-4 py-3 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inst) => {
                  const sc = STATUS_CONFIG[inst.status] ?? STATUS_CONFIG.pending;
                  const amount = fmtCurrency(inst.request_data.amount ?? inst.request_data.total_budget ?? inst.request_data.budget ?? inst.request_data.contract_value);
                  return (
                    <tr key={inst.instance_id} className={`hover:bg-gray-50 transition-colors ${inst.sla_breached && inst.status === "in_progress" ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-blue-600 font-semibold">{inst.instance_code}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{inst.process_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Building2 size={11} /> {inst.related_entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">
                        {String(inst.request_data.supplier_name ?? inst.request_data.project_name ?? inst.request_data.contract_name ?? inst.request_data.budget_name ?? "").slice(0, 30) || "—"}
                        {amount && <span className="ml-1 text-gray-700 font-medium">{amount}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${sc.cls}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {inst.current_step_name ?? (inst.status === "approved" ? "Concluído" : inst.status === "rejected" ? "Rejeitado" : "—")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(inst.created_at)}</td>
                      <td className="px-4 py-3">
                        {inst.sla_breached && ["pending", "in_progress"].includes(inst.status) ? (
                          <span className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                            <AlertTriangle size={11} /> Vencido
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">{fmtDate(inst.sla_due_date)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/awq/bpm/instances/${inst.instance_id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                        >
                          Ver <ArrowRight size={11} />
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

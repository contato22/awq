"use client";

// ─── /awq/bpm/instances — Active Process Instances ────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight, RefreshCw, Filter, CheckCircle2, XCircle,
  Clock, AlertTriangle, Loader2,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { ProcessInstance } from "@/lib/bpm-types";

const USER_NAMES: Record<string, string> = {
  "1": "Alex", "2": "Sam", "3": "Priya", "4": "Danilo", "5": "Miguel",
};

type StatusFilter = "all" | "in_progress" | "approved" | "rejected" | "cancelled";

const STATUS_BADGE: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-700",
  approved:    "bg-green-100 text-green-700",
  rejected:    "bg-red-100 text-red-700",
  cancelled:   "bg-gray-100 text-gray-600",
};

export default function BpmInstancesPage() {
  const [instances, setInstances]   = useState<ProcessInstance[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatus]   = useState<StatusFilter>("all");
  const [search, setSearch]         = useState("");

  async function load(status: StatusFilter = "all") {
    setLoading(true);
    try {
      const qs = status !== "all" ? `?status=${status}` : "";
      const res  = await fetch(`/api/bpm/process-instance${qs}`);
      const json = await res.json();
      if (json.success) setInstances(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const filtered = instances.filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.instance_code.toLowerCase().includes(s) ||
      i.process_name.toLowerCase().includes(s) ||
      i.related_entity_type.toLowerCase().includes(s)
    );
  });

  const counts = {
    in_progress: instances.filter((i) => i.status === "in_progress").length,
    approved:    instances.filter((i) => i.status === "approved").length,
    rejected:    instances.filter((i) => i.status === "rejected").length,
    cancelled:   instances.filter((i) => i.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Instâncias de Processo</h1>
            <p className="text-sm text-gray-500">Histórico e status de todos os workflows</p>
          </div>
          <button onClick={() => load(statusFilter)} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Em Andamento" value={counts.in_progress} color="text-blue-600" />
          <StatCard label="Aprovados" value={counts.approved} color="text-green-600" />
          <StatCard label="Rejeitados" value={counts.rejected} color="text-red-600" />
          <StatCard label="Cancelados" value={counts.cancelled} color="text-gray-600" />
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {(["all", "in_progress", "approved", "rejected", "cancelled"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                {{ all: "Todos", in_progress: "Em andamento", approved: "Aprovados", rejected: "Rejeitados", cancelled: "Cancelados" }[s]}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar por código, processo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhuma instância encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Código", "Processo", "Entidade", "Iniciado por", "Step Atual", "SLA", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((inst) => (
                    <tr key={inst.instance_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{inst.instance_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{inst.process_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{inst.related_entity_type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{USER_NAMES[inst.initiated_by] ?? inst.initiated_by}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{inst.current_step_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {inst.sla_breached ? (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-semibold"><AlertTriangle className="h-3 w-3" />Vencido</span>
                        ) : inst.sla_due_date ? (
                          <span className="text-xs text-gray-400">{new Date(inst.sla_due_date).toLocaleDateString("pt-BR")}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[inst.status]}`}>
                          {inst.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/awq/bpm/instances/${inst.instance_id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                          Ver →
                        </Link>
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

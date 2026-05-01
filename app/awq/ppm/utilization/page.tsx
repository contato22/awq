"use client";

// ─── /awq/ppm/utilization — Resource Utilization Dashboard ───────────────────
// Dedicated view for capacity planning: who's available vs overallocated.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Users, AlertTriangle, CheckCircle2, Circle, RefreshCw, TrendingUp } from "lucide-react";

type UtilRow = {
  user_id: string; user_name: string; email?: string;
  total_allocation_pct: number; utilization_status: string;
  active_projects: number; project_names: string[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  overallocated:      { label: "Superalocado",   color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",    icon: AlertTriangle },
  fully_allocated:    { label: "100% Alocado",   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",  icon: CheckCircle2  },
  partially_allocated:{ label: "Parcialmente",   color: "text-brand-700",   bg: "bg-brand-50",    border: "border-brand-200",  icon: Circle        },
  available:          { label: "Disponível",     color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200",icon: Circle        },
};

function UtilCard({ row }: { row: UtilRow }) {
  const cfg  = STATUS_CONFIG[row.utilization_status] ?? STATUS_CONFIG.available;
  const Icon = cfg.icon;
  const barW = Math.min(row.total_allocation_pct, 120);
  const over = row.total_allocation_pct > 100;

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${over ? "border-red-200" : "border-gray-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-gray-900">{row.user_name}</div>
          {row.email && <div className="text-[10px] text-gray-400">{row.email}</div>}
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          <Icon size={10} /> {cfg.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Alocação total</span>
          <span className={`font-bold ${over ? "text-red-600" : "text-gray-900"}`}>{row.total_allocation_pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${over ? "bg-red-500" : row.total_allocation_pct >= 80 ? "bg-amber-500" : "bg-brand-500"}`}
            style={{ width: `${Math.min(barW, 100)}%` }}
          />
        </div>
        {over && (
          <div className="text-[10px] text-red-500 font-medium mt-1">
            ⚠ {row.total_allocation_pct - 100}% acima da capacidade
          </div>
        )}
      </div>

      <div className="text-[10px] text-gray-500 space-y-1">
        <div><span className="font-semibold text-gray-700">{row.active_projects}</span> projeto(s) ativo(s)</div>
        {row.project_names?.slice(0, 3).map(name => (
          <div key={name} className="truncate text-gray-400">· {name}</div>
        ))}
        {(row.project_names?.length ?? 0) > 3 && (
          <div className="text-gray-400">+{row.project_names.length - 3} mais</div>
        )}
      </div>
    </div>
  );
}

export default function UtilizationPage() {
  const [utilization, setUtilization] = useState<UtilRow[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/ppm/resources?mode=utilization");
      const json = await res.json();
      if (json.success) setUtilization(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const overallocated = utilization.filter(r => r.utilization_status === "overallocated").length;
  const fullyAllocated = utilization.filter(r => r.utilization_status === "fully_allocated").length;
  const available     = utilization.filter(r => r.utilization_status === "available").length;
  const avgPct        = utilization.length > 0
    ? Math.round(utilization.reduce((s, r) => s + r.total_allocation_pct, 0) / utilization.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm/resources" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Utilização de Capacidade</h1>
                <p className="text-xs text-gray-500">{utilization.length} pessoa(s) · média {avgPct}% alocado</p>
              </div>
            </div>
          </div>
          <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Pessoas",    value: String(utilization.length), color: "text-gray-900" },
            { label: "Superalocados",    value: String(overallocated),      color: overallocated > 0 ? "text-red-600" : "text-gray-900" },
            { label: "100% Alocados",    value: String(fullyAllocated),     color: "text-amber-600" },
            { label: "Disponíveis",      value: String(available),          color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Capacity bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Users size={12} /> Distribuição de Capacidade
          </div>
          <div className="space-y-3">
            {[
              { label: "Superalocado (>100%)",     count: overallocated, total: utilization.length, color: "bg-red-500" },
              { label: "100% Alocado (80-100%)",   count: fullyAllocated, total: utilization.length, color: "bg-amber-500" },
              { label: "Parcial (50-79%)",          count: utilization.filter(r => r.utilization_status === "partially_allocated").length, total: utilization.length, color: "bg-brand-500" },
              { label: "Disponível (<50%)",          count: available, total: utilization.length, color: "bg-emerald-500" },
            ].map(({ label, count, total, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-44 text-[11px] text-gray-500 shrink-0">{label}</div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }} />
                </div>
                <div className="text-xs font-bold text-gray-700 w-6 text-right shrink-0">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Carregando…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {utilization
              .sort((a, b) => b.total_allocation_pct - a.total_allocation_pct)
              .map(row => <UtilCard key={row.user_id} row={row} />)
            }
            {utilization.length === 0 && (
              <div className="col-span-4 text-center py-12 text-sm text-gray-400">Nenhuma alocação ativa.</div>
            )}
          </div>
        )}

        <div className="text-center">
          <Link href="/awq/ppm/resources" className="text-sm text-brand-600 hover:underline">
            ← Ver todas as alocações
          </Link>
        </div>
      </div>
    </div>
  );
}

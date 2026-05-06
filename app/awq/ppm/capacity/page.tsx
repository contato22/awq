"use client";

// ─── /awq/ppm/capacity — Capacity Planning & Hiring Forecast ─────────────────
// Demand vs capacity analysis, overallocation alerts, hiring/contractor needs.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Users, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Plus, Briefcase, UserPlus,
} from "lucide-react";
import { ppmFetch } from "@/lib/ppm-fetch";
import type { PpmProject, PpmAllocation } from "@/lib/ppm-types";

interface UtilRow {
  user_id: string; user_name: string; email?: string;
  total_allocation_pct: number; utilization_status: string;
  active_projects: number; project_names: string[];
}

interface CapacityPerson {
  user_id:           string;
  user_name:         string;
  allocation_pct:    number;
  available_pct:     number;
  projects:          string[];
  status:            "overallocated" | "fully_allocated" | "partially_allocated" | "available";
}

type HiringNeed = {
  role:             string;
  headcount:        number;
  urgency:          "immediate" | "next_quarter" | "next_year";
  reason:           string;
  linked_projects:  string[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  overallocated:       { label: "Superalocado",    color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"    },
  fully_allocated:     { label: "100% Alocado",    color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"  },
  partially_allocated: { label: "Parcialmente",    color: "text-brand-700",   bg: "bg-brand-50",    border: "border-brand-200"  },
  available:           { label: "Disponível",      color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200"},
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  immediate:     { label: "Imediato",     color: "text-red-600 bg-red-100"    },
  next_quarter:  { label: "Próx. Trim.",  color: "text-amber-600 bg-amber-100"},
  next_year:     { label: "Próx. Ano",    color: "text-gray-600 bg-gray-100"  },
};

const MONTHS_AHEAD = 6;
function getMonths(): string[] {
  const result: string[] = [];
  const d = new Date();
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    result.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}

// ─── Compute capacity data from allocations ──────────────────────────────────

function computeCapacity(utilization: UtilRow[]): CapacityPerson[] {
  return utilization.map(u => ({
    user_id:        u.user_id,
    user_name:      u.user_name,
    allocation_pct: u.total_allocation_pct,
    available_pct:  Math.max(0, 100 - u.total_allocation_pct),
    projects:       u.project_names ?? [],
    status:         u.utilization_status as CapacityPerson["status"],
  }));
}

function deriveHiringNeeds(capacity: CapacityPerson[], projects: PpmProject[]): HiringNeed[] {
  const needs: HiringNeed[] = [];
  const overallocated = capacity.filter(p => p.status === "overallocated");

  if (overallocated.length > 0) {
    needs.push({
      role:            "Generalista / Suporte de Projetos",
      headcount:       Math.ceil(overallocated.length / 2),
      urgency:         "immediate",
      reason:          `${overallocated.length} pessoa(s) superalocada(s) — risco imediato de burnout e queda de qualidade`,
      linked_projects: [...new Set(overallocated.flatMap(p => p.projects))].slice(0, 4),
    });
  }

  const activeProjects = projects.filter(p => p.status === "active");
  const highPriorityCount = activeProjects.filter(p => p.priority === "high" || p.priority === "critical").length;
  if (highPriorityCount > 3) {
    needs.push({
      role:            "Project Manager Sênior",
      headcount:       1,
      urgency:         "next_quarter",
      reason:          `${highPriorityCount} projetos de alta prioridade simultâneos — PM adicional para garantir qualidade de entrega`,
      linked_projects: activeProjects.filter(p => p.priority === "high" || p.priority === "critical").map(p => p.project_name).slice(0, 3),
    });
  }

  const retainerProjects = projects.filter(p => p.project_type === "retainer" && p.status === "active");
  if (retainerProjects.length >= 2) {
    needs.push({
      role:            "Especialista em Social Media / Conteúdo",
      headcount:       Math.ceil(retainerProjects.length / 2),
      urgency:         "next_quarter",
      reason:          `${retainerProjects.length} projetos retainer ativos — necessidade de recursos dedicados para entregas recorrentes`,
      linked_projects: retainerProjects.map(p => p.project_name).slice(0, 3),
    });
  }

  const available = capacity.filter(p => p.status === "available");
  if (available.length > capacity.length * 0.3 && projects.length > 0) {
    needs.push({
      role:            "Business Development / Comercial",
      headcount:       1,
      urgency:         "next_quarter",
      reason:          `${available.length} pessoa(s) com capacidade disponível — oportunidade de escalar portfólio com novos projetos`,
      linked_projects: [],
    });
  }

  return needs;
}

function computeMonthlyDemand(allocations: PpmAllocation[], months: string[]): Record<string, { demand: number; capacity: number }> {
  const teamSize = new Set(allocations.map(a => a.user_id)).size || 5;
  const capacityHoursPerPerson = 160; // ~40h/week × 4 weeks

  return Object.fromEntries(months.map(month => {
    const active = allocations.filter(a => {
      const sd = a.start_date <= `${month}-31`;
      const ed = !a.end_date || a.end_date >= `${month}-01`;
      return a.status === "active" && sd && ed;
    });
    const demandHours = active.reduce((s, a) => s + (a.hours_per_week ?? (a.allocation_pct / 100) * 40) * 4, 0);
    return [month, { demand: Math.round(demandHours), capacity: teamSize * capacityHoursPerPerson }];
  }));
}

export default function CapacityPage() {
  const [utilization, setUtilization] = useState<UtilRow[]>([]);
  const [projects,    setProjects]    = useState<PpmProject[]>([]);
  const [allocations, setAllocations] = useState<PpmAllocation[]>([]);
  const [loading,     setLoading]     = useState(true);

  // Hiring form state
  const [showHireForm, setShowHireForm] = useState(false);
  const [customNeeds,  setCustomNeeds]  = useState<HiringNeed[]>([]);
  const [hireForm,     setHireForm]     = useState<HiringNeed>({
    role: "", headcount: 1, urgency: "next_quarter", reason: "", linked_projects: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsJson, projectsJson, allocsJson] = await Promise.all([
        ppmFetch("/api/ppm/resources?mode=utilization"),
        ppmFetch("/api/ppm/projects"),
        ppmFetch("/api/ppm/resources"),
      ]) as [
        { success: boolean; data: UtilRow[] },
        { success: boolean; data: { projects: PpmProject[] } },
        { success: boolean; data: PpmAllocation[] },
      ];
      if (metricsJson.success)  setUtilization(metricsJson.data ?? []);
      if (projectsJson.success) setProjects(projectsJson.data.projects ?? []);
      if (allocsJson.success)   setAllocations(allocsJson.data ?? []);
    } catch { /* keep existing */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const capacity     = computeCapacity(utilization);
  const months       = getMonths();
  const monthlyData  = computeMonthlyDemand(allocations, months);
  const hiringNeeds  = [...deriveHiringNeeds(capacity, projects), ...customNeeds];

  const overCount    = capacity.filter(p => p.status === "overallocated").length;
  const fullCount    = capacity.filter(p => p.status === "fully_allocated").length;
  const partialCount = capacity.filter(p => p.status === "partially_allocated").length;
  const availCount   = capacity.filter(p => p.status === "available").length;
  const totalPeople  = capacity.length;
  const avgUtil      = totalPeople > 0
    ? Math.round(capacity.reduce((s, p) => s + p.allocation_pct, 0) / totalPeople)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Planejamento de Capacidade</h1>
              <p className="text-xs text-gray-500">
                Demanda vs capacidade · Forecast de contratação · Necessidade de freelancers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <Link href="/awq/ppm/utilization" className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">
              Ver Utilização →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Time Total",    value: totalPeople, color: "text-gray-900"    },
            { label: "Superalocados", value: overCount,   color: "text-red-600"     },
            { label: "100% Alocados", value: fullCount,   color: "text-amber-600"   },
            { label: "Disponíveis",   value: availCount,  color: "text-emerald-600" },
            { label: "Util. Média",   value: `${avgUtil}%`, color: avgUtil > 90 ? "text-red-600" : avgUtil > 70 ? "text-amber-600" : "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Monthly Demand vs Capacity Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <TrendingUp size={12} className="text-brand-600" /> Demanda vs Capacidade — Próximos 6 Meses
          </div>
          <div className="space-y-3">
            {months.map(month => {
              const { demand, capacity: cap } = monthlyData[month] ?? { demand: 0, capacity: 800 };
              const util    = cap > 0 ? Math.min(140, Math.round((demand / cap) * 100)) : 0;
              const isOver  = demand > cap;
              const barPct  = Math.min(100, util);
              return (
                <div key={month} className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-gray-500 w-16 shrink-0">{monthLabel(month)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Demanda: {demand}h</span>
                      <span>Capacidade: {cap}h</span>
                      <span className={`font-bold ${isOver ? "text-red-600" : "text-emerald-600"}`}>{util}%</span>
                    </div>
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : util > 80 ? "bg-amber-400" : "bg-brand-500"}`}
                        style={{ width: `${barPct}%` }}
                      />
                      {/* Capacity line at 100% */}
                      <div className="absolute top-0 bottom-0 border-r-2 border-gray-400 border-dashed" style={{ left: "100%", transform: "translateX(-1px)" }} />
                    </div>
                    {isOver && (
                      <div className="text-[10px] text-red-500 font-medium mt-0.5">
                        ⚠ Gap: {demand - cap}h acima da capacidade — considerar freelancers
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-brand-500" /> Normal (&lt;80%)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-amber-400" /> Atenção (80-100%)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-red-500"   /> Acima da capacidade (&gt;100%)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Capacity Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <Users size={12} /> Disponibilidade do Time
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Carregando…</div>
              ) : capacity.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhum recurso encontrado.</div>
              ) : capacity.sort((a, b) => b.allocation_pct - a.allocation_pct).map(p => {
                const cfg  = STATUS_CONFIG[p.status];
                const over = p.allocation_pct > 100;
                return (
                  <div key={p.user_id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{p.user_name}</div>
                        <div className="text-[10px] text-gray-400">{p.projects.slice(0, 2).join(" · ")}{p.projects.length > 2 ? ` +${p.projects.length - 2}` : ""}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${over ? "bg-red-500" : p.allocation_pct >= 80 ? "bg-amber-400" : "bg-brand-500"}`}
                          style={{ width: `${Math.min(p.allocation_pct, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${over ? "text-red-600" : "text-gray-700"}`}>
                        {p.allocation_pct}%
                      </span>
                      <span className={`text-[10px] w-16 text-right ${p.available_pct > 0 ? "text-emerald-600" : "text-gray-400"}`}>
                        {p.available_pct > 0 ? `+${p.available_pct}% livre` : "sem espaço"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hiring / Contractor Needs */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <UserPlus size={12} /> Necessidades de Contratação / Freelancers
                </div>
                <button onClick={() => setShowHireForm(s => !s)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700">
                  <Plus size={10} /> Adicionar
                </button>
              </div>

              {showHireForm && (
                <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/50">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={hireForm.role} onChange={e => setHireForm(f => ({ ...f, role: e.target.value }))}
                        placeholder="Cargo / Perfil *" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                      <div className="flex gap-2">
                        <input type="number" min={1} value={hireForm.headcount} onChange={e => setHireForm(f => ({ ...f, headcount: +e.target.value }))}
                          className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                        <select value={hireForm.urgency} onChange={e => setHireForm(f => ({ ...f, urgency: e.target.value as HiringNeed["urgency"] }))}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none">
                          <option value="immediate">Imediato</option>
                          <option value="next_quarter">Próx. Trim.</option>
                          <option value="next_year">Próx. Ano</option>
                        </select>
                      </div>
                    </div>
                    <input value={hireForm.reason} onChange={e => setHireForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Justificativa *" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowHireForm(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                      <button onClick={() => {
                        if (!hireForm.role.trim()) return;
                        setCustomNeeds(n => [...n, { ...hireForm }]);
                        setHireForm({ role: "", headcount: 1, urgency: "next_quarter", reason: "", linked_projects: [] });
                        setShowHireForm(false);
                      }} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {hiringNeeds.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-500">Sem necessidades de contratação identificadas.</div>
                    <div className="text-xs text-gray-400">O time atual comporta o portfólio ativo.</div>
                  </div>
                ) : hiringNeeds.map((n, idx) => {
                  const urg = URGENCY_CONFIG[n.urgency];
                  return (
                    <div key={idx} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{n.headcount}x {n.role}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${urg.color}`}>{urg.label}</span>
                          </div>
                        </div>
                        {idx >= hiringNeeds.length - customNeeds.length && (
                          <button onClick={() => setCustomNeeds(cn => cn.filter((_, i) => i !== idx - (hiringNeeds.length - customNeeds.length)))}
                            className="p-1 text-gray-300 hover:text-red-500 shrink-0">
                            ✕
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{n.reason}</p>
                      {n.linked_projects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {n.linked_projects.map(pr => (
                            <span key={pr} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {pr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bench Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Briefcase size={12} /> Resumo de Bench
              </div>
              <div className="space-y-2">
                {capacity.filter(p => p.available_pct >= 30).map(p => (
                  <div key={p.user_id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">{p.user_name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.available_pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-emerald-600 w-12 text-right">{p.available_pct}% livre</span>
                    </div>
                  </div>
                ))}
                {capacity.filter(p => p.available_pct >= 30).length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-2">
                    Nenhuma pessoa com &gt;30% de capacidade disponível.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

// ─── /awq/ppm/scenarios — Portfolio What-If Scenarios ────────────────────────
// Simulate adding/removing projects and adjusting budgets to see portfolio impact.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, FlaskConical, Plus, X,
  TrendingUp, TrendingDown, DollarSign, Users, BarChart3,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { PpmProject } from "@/lib/ppm-types";

interface ScenarioProject {
  project_id: string;
  project_name: string;
  bu_code: string;
  included: boolean;
  original_budget_revenue: number;
  original_budget_cost: number;
  adj_revenue: number;
  adj_cost: number;
  team_size: number;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  projects: ScenarioProject[];
  created_at: string;
}

function buildBaseScenario(projects: PpmProject[]): ScenarioProject[] {
  return projects.map(p => ({
    project_id:              p.project_id,
    project_name:            p.project_name,
    bu_code:                 p.bu_code,
    included:                true,
    original_budget_revenue: p.budget_revenue,
    original_budget_cost:    p.budget_cost,
    adj_revenue:             p.budget_revenue,
    adj_cost:                p.budget_cost,
    team_size:               p.team_size ?? 1,
  }));
}

function calcMetrics(rows: ScenarioProject[]) {
  const inc = rows.filter(r => r.included);
  const revenue = inc.reduce((s, r) => s + r.adj_revenue, 0);
  const cost    = inc.reduce((s, r) => s + r.adj_cost,    0);
  const margin  = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
  const headcount = inc.reduce((s, r) => s + r.team_size, 0);
  return { revenue, cost, margin, headcount, count: inc.length };
}

const BU_CHIP: Record<string, string> = {
  JACQES:  "bg-brand-100  text-brand-700",
  CAZA:    "bg-violet-100 text-violet-700",
  ADVISOR: "bg-emerald-100 text-emerald-700",
  VENTURE: "bg-amber-100  text-amber-700",
  AWQ:     "bg-gray-100   text-gray-600",
};

export default function ScenariosPage() {
  const [projects,  setProjects]  = useState<PpmProject[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [active,    setActive]    = useState<Scenario | null>(null);
  const [newName,   setNewName]   = useState("");
  const [newDesc,   setNewDesc]   = useState("");
  const [showNew,   setShowNew]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/ppm/projects");
      const json = await res.json();
      if (json.success) setProjects(json.data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Baseline (read-only)
  const baseline = projects.length > 0 ? calcMetrics(buildBaseScenario(projects)) : null;

  function createScenario() {
    if (!newName.trim()) return;
    const s: Scenario = {
      id:          crypto.randomUUID(),
      name:        newName.trim(),
      description: newDesc.trim(),
      projects:    buildBaseScenario(projects),
      created_at:  new Date().toISOString(),
    };
    setScenarios(prev => [...prev, s]);
    setActive(s);
    setNewName("");
    setNewDesc("");
    setShowNew(false);
  }

  function deleteScenario(id: string) {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (active?.id === id) setActive(null);
  }

  function updateActive(fn: (s: Scenario) => Scenario) {
    if (!active) return;
    const updated = fn(active);
    setActive(updated);
    setScenarios(prev => prev.map(s => s.id === updated.id ? updated : s));
  }

  function toggleProject(project_id: string) {
    updateActive(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.project_id === project_id ? { ...p, included: !p.included } : p
      ),
    }));
  }

  function adjustRevenue(project_id: string, val: string) {
    const n = parseFloat(val) || 0;
    updateActive(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.project_id === project_id ? { ...p, adj_revenue: n } : p
      ),
    }));
  }

  function adjustCost(project_id: string, val: string) {
    const n = parseFloat(val) || 0;
    updateActive(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.project_id === project_id ? { ...p, adj_cost: n } : p
      ),
    }));
  }

  function resetProject(project_id: string) {
    updateActive(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.project_id === project_id
          ? { ...p, adj_revenue: p.original_budget_revenue, adj_cost: p.original_budget_cost, included: true }
          : p
      ),
    }));
  }

  const activeMetrics = active ? calcMetrics(active.projects) : null;

  function delta(a: number, b: number) {
    const d = a - b;
    return { value: d, pct: b !== 0 ? (d / b) * 100 : 0, positive: d >= 0 };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Cenários de Portfólio</h1>
              <p className="text-xs text-gray-500">Análise what-if · simulação de orçamentos e alocação</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
              <Plus size={14} /> Novo Cenário
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* New Scenario Modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FlaskConical size={14} className="text-brand-600" /> Novo Cenário
                </h2>
                <button onClick={() => setShowNew(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome do Cenário *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Corte de 20% · Expansão Q3 · Cenário Conservador"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição</label>
                  <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder="Hipótese principal deste cenário…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button onClick={createScenario} disabled={!newName.trim()}
                    className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60">
                    Criar Cenário
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Baseline KPIs */}
        {baseline && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Baseline — Portfólio Atual ({baseline.count} projetos)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Revenue Total",  value: formatBRL(baseline.revenue), icon: DollarSign,  color: "text-emerald-600" },
                { label: "Custo Total",    value: formatBRL(baseline.cost),    icon: TrendingDown, color: "text-red-600"     },
                { label: "Margem",         value: `${baseline.margin.toFixed(1)}%`, icon: BarChart3, color: "text-brand-600" },
                { label: "Headcount",      value: `${baseline.headcount} pessoas`, icon: Users,   color: "text-gray-700"   },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon size={14} className={color} />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase">{label}</div>
                    <div className={`text-sm font-bold ${color}`}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Scenario List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cenários Salvos</div>
            {scenarios.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center">
                <FlaskConical size={20} className="text-gray-300 mx-auto mb-2" />
                <div className="text-xs text-gray-400">Nenhum cenário ainda.</div>
                <button onClick={() => setShowNew(true)} className="text-xs text-brand-600 hover:underline mt-1">
                  Criar primeiro cenário →
                </button>
              </div>
            ) : (
              scenarios.map(s => {
                const m = calcMetrics(s.projects);
                const isActive = active?.id === s.id;
                return (
                  <div key={s.id}
                    onClick={() => setActive(s)}
                    className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${isActive ? "border-brand-300 ring-2 ring-brand-200 shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{s.name}</div>
                        {s.description && <div className="text-[10px] text-gray-400 truncate">{s.description}</div>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteScenario(s.id); }}
                        className="p-1 text-gray-300 hover:text-red-500 rounded ml-1 shrink-0">
                        <X size={11} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 text-[10px]">
                      <div><span className="text-gray-400">Revenue</span><br /><span className="font-bold text-emerald-600">{formatBRL(m.revenue)}</span></div>
                      <div><span className="text-gray-400">Margem</span><br /><span className={`font-bold ${m.margin >= 40 ? "text-emerald-600" : m.margin >= 20 ? "text-amber-600" : "text-red-600"}`}>{m.margin.toFixed(1)}%</span></div>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">{m.count} projetos · {m.headcount} pessoas</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Scenario Editor */}
          <div className="lg:col-span-3">
            {!active ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
                <FlaskConical size={32} className="text-gray-200 mx-auto mb-3" />
                <div className="text-sm text-gray-400 mb-2">Selecione ou crie um cenário para começar a simulação</div>
                <button onClick={() => setShowNew(true)} className="text-sm text-brand-600 hover:underline">
                  Criar cenário →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Scenario header + delta KPIs */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <FlaskConical size={14} className="text-brand-600" /> {active.name}
                      </div>
                      {active.description && <div className="text-xs text-gray-400 mt-0.5">{active.description}</div>}
                    </div>
                  </div>
                  {activeMetrics && baseline && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Revenue",  cur: activeMetrics.revenue, base: baseline.revenue, fmt: formatBRL, invert: false },
                        { label: "Custo",    cur: activeMetrics.cost,    base: baseline.cost,    fmt: formatBRL, invert: true  },
                        { label: "Margem",   cur: activeMetrics.margin,  base: baseline.margin,  fmt: (v: number) => `${v.toFixed(1)}%`, invert: false },
                        { label: "Projetos", cur: activeMetrics.count,   base: baseline.count,   fmt: (v: number) => String(v), invert: false },
                      ].map(({ label, cur, base, fmt, invert }) => {
                        const d = delta(cur, base);
                        const isPositive = invert ? !d.positive : d.positive;
                        return (
                          <div key={label} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{label}</div>
                            <div className="text-sm font-bold text-gray-900">{fmt(cur)}</div>
                            {d.value !== 0 && (
                              <div className={`flex items-center gap-1 text-[10px] font-semibold mt-0.5 ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                                {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {d.pct > 0 ? "+" : ""}{d.pct.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Project adjustments table */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Projetos no Cenário</div>
                    <div className="text-[10px] text-gray-400">Edite receita e custo para simular ajustes</div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {active.projects.map(p => {
                      const revDiff  = p.adj_revenue - p.original_budget_revenue;
                      const costDiff = p.adj_cost    - p.original_budget_cost;
                      return (
                        <div key={p.project_id}
                          className={`px-5 py-3 flex items-center gap-4 transition-colors ${p.included ? "" : "opacity-40 bg-gray-50"}`}>
                          {/* Toggle */}
                          <input type="checkbox" checked={p.included} onChange={() => toggleProject(p.project_id)}
                            className="w-4 h-4 rounded accent-brand-600 cursor-pointer shrink-0" />
                          {/* Project info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{p.project_name}</div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BU_CHIP[p.bu_code] ?? "bg-gray-100 text-gray-600"}`}>
                              {p.bu_code}
                            </span>
                          </div>
                          {/* Revenue adj */}
                          <div className="shrink-0">
                            <div className="text-[10px] text-gray-400 mb-1">Revenue (R$)</div>
                            <input
                              type="number" disabled={!p.included}
                              value={p.adj_revenue}
                              onChange={e => adjustRevenue(p.project_id, e.target.value)}
                              className="w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                            {revDiff !== 0 && (
                              <div className={`text-[10px] font-medium mt-0.5 ${revDiff > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {revDiff > 0 ? "+" : ""}{formatBRL(revDiff)}
                              </div>
                            )}
                          </div>
                          {/* Cost adj */}
                          <div className="shrink-0">
                            <div className="text-[10px] text-gray-400 mb-1">Custo (R$)</div>
                            <input
                              type="number" disabled={!p.included}
                              value={p.adj_cost}
                              onChange={e => adjustCost(p.project_id, e.target.value)}
                              className="w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                            {costDiff !== 0 && (
                              <div className={`text-[10px] font-medium mt-0.5 ${costDiff < 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {costDiff > 0 ? "+" : ""}{formatBRL(costDiff)}
                              </div>
                            )}
                          </div>
                          {/* Margin preview */}
                          <div className="shrink-0 w-20 text-right">
                            <div className="text-[10px] text-gray-400 mb-1">Margem</div>
                            <div className={`text-sm font-bold ${
                              !p.included ? "text-gray-300" :
                              p.adj_revenue > 0 ? (
                                ((p.adj_revenue - p.adj_cost) / p.adj_revenue * 100) >= 40 ? "text-emerald-600" :
                                ((p.adj_revenue - p.adj_cost) / p.adj_revenue * 100) >= 20 ? "text-amber-600" : "text-red-600"
                              ) : "text-gray-400"
                            }`}>
                              {p.included && p.adj_revenue > 0
                                ? `${((p.adj_revenue - p.adj_cost) / p.adj_revenue * 100).toFixed(1)}%`
                                : "—"}
                            </div>
                          </div>
                          {/* Reset */}
                          <button onClick={() => resetProject(p.project_id)}
                            className="text-[10px] text-gray-300 hover:text-gray-500 shrink-0" title="Resetar">
                            ↺
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

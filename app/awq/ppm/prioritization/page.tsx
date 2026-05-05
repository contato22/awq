"use client";

// ─── /awq/ppm/prioritization — Project Prioritization & Scoring ───────────────
// Strategic alignment × ROI × Risk scoring with drag-to-rank and editable scores.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, TrendingUp, Star, Shield,
  DollarSign, ChevronUp, ChevronDown, Save,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { PpmProject } from "@/lib/ppm-types";

type Priority = "low" | "medium" | "high" | "critical";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  critical: { label: "Crítico",  color: "text-red-700",     bg: "bg-red-100 border-red-200"     },
  high:     { label: "Alto",     color: "text-orange-700",  bg: "bg-orange-100 border-orange-200"},
  medium:   { label: "Médio",    color: "text-amber-700",   bg: "bg-amber-100 border-amber-200"  },
  low:      { label: "Baixo",    color: "text-gray-600",    bg: "bg-gray-100 border-gray-200"    },
};

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500",
};

interface ScoredProject extends PpmProject {
  composite_score: number;
  rank: number;
  alignment_score: number;  // 0-10
  roi_score: number;         // 0-10
  risk_score_inv: number;    // 0-10 (inverted risk)
}

function scoreProject(p: PpmProject): ScoredProject {
  const alignment_score = Math.min(10, Math.round((p.strategic_alignment ?? 0.5) * 10));

  // ROI score: normalize roi_estimate vs budget (capped at 10x = 10 pts)
  const roiRatio = p.budget_cost > 0 ? (p.roi_estimate ?? p.budget_revenue) / p.budget_cost : 0;
  const roi_score = Math.min(10, Math.round(roiRatio));

  // Risk = 0-10 inversed from health (green=8, yellow=5, red=2)
  const risk_score_inv = p.health_status === "green" ? 8 : p.health_status === "yellow" ? 5 : 2;

  // Weighted composite (40% alignment, 40% ROI, 20% risk)
  const composite_score = Math.round(alignment_score * 0.4 + roi_score * 0.4 + risk_score_inv * 0.2);

  return { ...p, composite_score, rank: 0, alignment_score, roi_score, risk_score_inv };
}

function ScoreBar({ value, max = 10, color = "bg-brand-500" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-5 text-right">{value}</span>
    </div>
  );
}

export default function PrioritizationPage() {
  const [projects, setProjects]   = useState<PpmProject[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [editing,  setEditing]    = useState<Record<string, { alignment: string; roi: string }>>({});
  const [saving,   setSaving]     = useState<Record<string, boolean>>({});
  const [weights,  setWeights]    = useState({ alignment: 40, roi: 40, risk: 20 });
  const [filterBU, setFilterBU]   = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: filterStatus || "" });
      if (filterBU) params.set("bu_code", filterBU);
      const res  = await fetch(`/api/ppm/projects?${params}`);
      const json = await res.json();
      if (json.success) setProjects(json.data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }, [filterBU, filterStatus]);

  useEffect(() => { void load(); }, [load]);

  // Compute scored + ranked projects
  const scored: ScoredProject[] = projects
    .map(p => {
      const s = scoreProject(p);
      // Apply custom weights
      const composite = Math.round(
        s.alignment_score * (weights.alignment / 100) +
        s.roi_score        * (weights.roi       / 100) +
        s.risk_score_inv   * (weights.risk      / 100) * 10 / 10
      );
      return { ...s, composite_score: Math.min(10, composite) };
    })
    .sort((a, b) => b.composite_score - a.composite_score)
    .map((p, idx) => ({ ...p, rank: idx + 1 }));

  function startEdit(p: PpmProject) {
    setEditing(prev => ({
      ...prev,
      [p.project_id]: {
        alignment: String(Math.round((p.strategic_alignment ?? 0.5) * 10)),
        roi:       String(p.roi_estimate ?? p.budget_revenue),
      },
    }));
  }

  async function saveScores(p: PpmProject) {
    const e = editing[p.project_id];
    if (!e) return;
    setSaving(prev => ({ ...prev, [p.project_id]: true }));
    try {
      await fetch(`/api/ppm/projects/${p.project_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategic_alignment: parseFloat(e.alignment) / 10,
          roi_estimate:        parseFloat(e.roi),
        }),
      });
      setEditing(prev => { const n = { ...prev }; delete n[p.project_id]; return n; });
      void load();
    } finally {
      setSaving(prev => ({ ...prev, [p.project_id]: false }));
    }
  }

  const totalWeight = weights.alignment + weights.roi + weights.risk;

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
              <h1 className="text-lg font-bold text-gray-900">Priorização de Projetos</h1>
              <p className="text-xs text-gray-500">Scoring estratégico · ROI · Risco · Ranking do portfólio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <select value={filterBU} onChange={e => setFilterBU(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
              <option value="">Todas BUs</option>
              <option value="JACQES">JACQES</option>
              <option value="CAZA">Caza Vision</option>
              <option value="ADVISOR">Advisor</option>
              <option value="VENTURE">Venture</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
              <option value="">Todos Status</option>
              <option value="active">Ativo</option>
              <option value="on_hold">Em Pausa</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Weight Configuration */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Pesos do Scoring (total deve = 100)
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { key: "alignment" as const, label: "Alinhamento Estratégico", icon: Star,      color: "text-violet-600" },
              { key: "roi"       as const, label: "ROI / Retorno",           icon: DollarSign, color: "text-emerald-600"},
              { key: "risk"      as const, label: "Risco (inv.)",            icon: Shield,     color: "text-amber-600"  },
            ].map(({ key, label, icon: Icon, color }) => (
              <div key={key}>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                  <Icon size={12} className={color} /> {label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={0} max={100} step={5}
                    value={weights[key]}
                    onChange={e => setWeights(w => ({ ...w, [key]: +e.target.value }))}
                    className="flex-1 accent-brand-600"
                  />
                  <span className={`text-sm font-bold w-8 text-right ${totalWeight === 100 ? "text-gray-900" : "text-red-500"}`}>
                    {weights[key]}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {totalWeight !== 100 && (
            <div className="mt-3 text-xs text-red-500 font-medium">
              ⚠ Total dos pesos = {totalWeight}% (deve ser 100%)
            </div>
          )}
        </div>

        {/* Ranking Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["Rank","Projeto","BU","Alinhamento","ROI Score","Risco","Score","Prioridade","Orçamento","Health","Editar"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">Carregando…</td></tr>
              ) : scored.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum projeto encontrado.</td></tr>
              ) : scored.map(p => {
                const isEditing = !!editing[p.project_id];
                const isSaving  = !!saving[p.project_id];
                const prio = p.priority as Priority;
                const prioCfg = PRIORITY_CONFIG[prio];

                return (
                  <tr key={p.project_id} className={`hover:bg-gray-50 transition-colors ${p.rank <= 3 ? "bg-amber-50/30" : ""}`}>
                    {/* Rank */}
                    <td className="px-4 py-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${p.rank === 1 ? "bg-amber-400 text-white" :
                          p.rank === 2 ? "bg-gray-300 text-gray-700" :
                          p.rank === 3 ? "bg-orange-300 text-white" :
                          "bg-gray-100 text-gray-500"}`}>
                        {p.rank}
                      </div>
                    </td>
                    {/* Project */}
                    <td className="px-4 py-3 max-w-xs">
                      <Link href={`/awq/ppm/${p.project_id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-600 block truncate">
                        {p.project_name}
                      </Link>
                      <div className="text-[10px] text-gray-400 font-mono">{p.project_code}</div>
                    </td>
                    {/* BU */}
                    <td className="px-4 py-3 text-xs text-gray-500">{p.bu_code}</td>
                    {/* Alignment */}
                    <td className="px-4 py-3 w-32">
                      {isEditing ? (
                        <input type="number" min={0} max={10}
                          value={editing[p.project_id].alignment}
                          onChange={e => setEditing(prev => ({ ...prev, [p.project_id]: { ...prev[p.project_id], alignment: e.target.value } }))}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      ) : (
                        <ScoreBar value={p.alignment_score} color="bg-violet-500" />
                      )}
                    </td>
                    {/* ROI */}
                    <td className="px-4 py-3 w-32">
                      {isEditing ? (
                        <input type="number" min={0}
                          value={editing[p.project_id].roi}
                          onChange={e => setEditing(prev => ({ ...prev, [p.project_id]: { ...prev[p.project_id], roi: e.target.value } }))}
                          className="w-28 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      ) : (
                        <ScoreBar value={p.roi_score} color="bg-emerald-500" />
                      )}
                    </td>
                    {/* Risk */}
                    <td className="px-4 py-3 w-32">
                      <ScoreBar value={p.risk_score_inv} color={p.risk_score_inv >= 7 ? "bg-emerald-500" : p.risk_score_inv >= 4 ? "bg-amber-400" : "bg-red-500"} />
                    </td>
                    {/* Composite score */}
                    <td className="px-4 py-3">
                      <div className={`text-lg font-bold ${p.composite_score >= 7 ? "text-emerald-600" : p.composite_score >= 4 ? "text-amber-600" : "text-red-600"}`}>
                        {p.composite_score}<span className="text-xs text-gray-400 font-normal">/10</span>
                      </div>
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${prioCfg.bg} ${prioCfg.color}`}>
                        {prioCfg.label}
                      </span>
                    </td>
                    {/* Budget */}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{formatBRL(p.budget_revenue)}</div>
                      <div className="text-gray-400">custo: {formatBRL(p.budget_cost)}</div>
                    </td>
                    {/* Health */}
                    <td className="px-4 py-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${HEALTH_DOT[p.health_status]}`} />
                    </td>
                    {/* Edit */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={() => void saveScores(p)} disabled={isSaving}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-60">
                            <Save size={10} /> {isSaving ? "…" : "Salvar"}
                          </button>
                          <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[p.project_id]; return n; })}
                            className="text-[10px] font-semibold px-2 py-1 border border-gray-200 text-gray-500 rounded hover:bg-gray-50">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(p)}
                          className="text-[10px] text-gray-400 hover:text-brand-600 px-2 py-1 border border-gray-200 rounded hover:border-brand-200">
                          Editar scores
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quadrant summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ChevronUp size={12} className="text-emerald-500" /> Investir (Score ≥ 7)
            </div>
            <div className="space-y-1">
              {scored.filter(p => p.composite_score >= 7).map(p => (
                <div key={p.project_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800 truncate max-w-48">{p.project_name}</span>
                  <span className="font-bold text-emerald-600 ml-2">{p.composite_score}/10</span>
                </div>
              ))}
              {scored.filter(p => p.composite_score >= 7).length === 0 && (
                <div className="text-xs text-gray-400">Nenhum</div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ChevronDown size={12} className="text-red-500" /> Reavaliar (Score ≤ 3)
            </div>
            <div className="space-y-1">
              {scored.filter(p => p.composite_score <= 3).map(p => (
                <div key={p.project_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800 truncate max-w-48">{p.project_name}</span>
                  <span className="font-bold text-red-600 ml-2">{p.composite_score}/10</span>
                </div>
              ))}
              {scored.filter(p => p.composite_score <= 3).length === 0 && (
                <div className="text-xs text-gray-400">Nenhum</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

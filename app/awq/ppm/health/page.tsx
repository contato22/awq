"use client";

// ─── /awq/ppm/health — Portfolio Health Report ───────────────────────────────
// Shows per-project health scores: schedule variance, budget variance,
// risk exposure, issue count, EVM CPI/SPI. Full traffic-light view.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Clock, DollarSign, Minus,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { cpiLabel, spiLabel, daysOverdue, calcBudgetHealth, marginPct, marginColor } from "@/lib/ppm-utils";
import type { PpmProject } from "@/lib/ppm-types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthRow {
  project: PpmProject;
  cpi:     number | null;
  spi:     number | null;
  eac:     number | null;
  daysLate: number;
  openRisks: number;
  openIssues: number;
  budgetVariancePct: number;
  overallHealth: "green" | "yellow" | "red";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEALTH_BG: Record<string, string> = {
  green:  "bg-emerald-50  border-emerald-200",
  yellow: "bg-amber-50    border-amber-200",
  red:    "bg-red-50      border-red-200",
};
const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500",
};
const HEALTH_LABEL: Record<string, string> = {
  green: "Saudável", yellow: "Em Risco", red: "Crítico",
};

function deriveHealth(cpi: number | null, spi: number | null, daysLate: number, budgetVarPct: number): "green" | "yellow" | "red" {
  const bad = (cpi != null && cpi < 0.85) || (spi != null && spi < 0.85) || daysLate > 14 || budgetVarPct < -15;
  const warn = (cpi != null && cpi < 0.95) || (spi != null && spi < 0.95) || daysLate > 0 || budgetVarPct < -5;
  return bad ? "red" : warn ? "yellow" : "green";
}

// ─── Health Card ──────────────────────────────────────────────────────────────

function HealthCard({ row }: { row: HealthRow }) {
  const { project: p, cpi, spi, eac, daysLate, openRisks, openIssues, budgetVariancePct, overallHealth } = row;
  const bh = calcBudgetHealth(p.budget_cost, p.actual_cost);
  const cpiInfo = cpiLabel(cpi);
  const spiInfo = spiLabel(spi);
  const mPct  = marginPct(p.budget_revenue, p.budget_cost);

  return (
    <div className={`rounded-xl border p-4 ${HEALTH_BG[overallHealth]} shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${HEALTH_DOT[overallHealth]}`} />
            <Link href={`/awq/ppm/${p.project_id}`}
              className="text-sm font-bold text-gray-900 hover:underline truncate"
            >
              {p.project_name}
            </Link>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <span className="text-[10px] font-mono text-gray-400">{p.project_code}</span>
            <span className="text-[10px] text-gray-500">{p.customer_name ?? "—"}</span>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            overallHealth === "green"  ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
            overallHealth === "yellow" ? "bg-amber-100 text-amber-700 border-amber-200" :
            "bg-red-100 text-red-700 border-red-200"
          }`}>
            {HEALTH_LABEL[overallHealth]}
          </span>
          <span className="text-[10px] text-gray-500">{p.project_manager ?? "—"}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Progresso</span>
          <span>{(p.completion_pct ?? 0).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-gray-200">
          <div
            className={`h-full rounded-full transition-all ${overallHealth === "red" ? "bg-red-400" : overallHealth === "yellow" ? "bg-amber-400" : "bg-emerald-500"}`}
            style={{ width: `${p.completion_pct ?? 0}%` }}
          />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <div className={`text-sm font-bold ${cpiInfo.color}`}>{cpiInfo.label}</div>
          <div className="text-[10px] text-gray-500">CPI</div>
        </div>
        <div>
          <div className={`text-sm font-bold ${spiInfo.color}`}>{spiInfo.label}</div>
          <div className="text-[10px] text-gray-500">SPI</div>
        </div>
        <div>
          <div className={`text-sm font-bold ${marginColor(mPct)}`}>{mPct.toFixed(1)}%</div>
          <div className="text-[10px] text-gray-500">Margem</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 border-t border-white/70 pt-2">
        <div className="flex items-center gap-1">
          <DollarSign size={11} className="text-gray-400 shrink-0" />
          <span className="truncate">Budget: {formatBRL(p.budget_cost)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={bh.color + " font-semibold truncate"}>{bh.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={11} className="text-gray-400 shrink-0" />
          <span>{formatDateBR(p.planned_end_date)}</span>
        </div>
        <div className={`flex items-center gap-1 ${daysLate > 0 ? "text-red-600 font-semibold" : "text-gray-500"}`}>
          {daysLate > 0 ? <TrendingDown size={11} /> : daysLate < 0 ? <TrendingUp size={11} className="text-emerald-500" /> : <Minus size={11} />}
          {daysLate > 0 ? `${daysLate}d atrasado` : daysLate < 0 ? `${Math.abs(daysLate)}d adiantado` : "No prazo"}
        </div>
        {eac != null && (
          <>
            <div className="flex items-center gap-1 col-span-2 text-[10px] text-gray-500">
              EAC: <span className="font-semibold ml-1">{formatBRL(eac)}</span>
              {eac > p.budget_cost && <span className="text-red-500 ml-1">(+{formatBRL(eac - p.budget_cost)} over)</span>}
            </div>
          </>
        )}
        <div className="flex items-center gap-1">
          <AlertTriangle size={11} className={openRisks > 0 ? "text-amber-500" : "text-gray-300"} />
          <span>{openRisks} risco{openRisks !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle size={11} className={openIssues > 0 ? "text-red-400" : "text-gray-300"} />
          <span>{openIssues} issue{openIssues !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Summary Banner ───────────────────────────────────────────────────────────

function SummaryBanner({ rows }: { rows: HealthRow[] }) {
  const g = rows.filter(r => r.overallHealth === "green").length;
  const y = rows.filter(r => r.overallHealth === "yellow").length;
  const r = rows.filter(r => r.overallHealth === "red").length;
  const total = rows.length || 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Saúde do Portfolio</h2>
        <span className="text-xs text-gray-500">{rows.length} projetos ativos</span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div>
          <div className="text-3xl font-bold text-emerald-600">{g}</div>
          <div className="text-xs text-gray-500">Saudável</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-amber-600">{y}</div>
          <div className="text-xs text-gray-500">Em Risco</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-red-600">{r}</div>
          <div className="text-xs text-gray-500">Crítico</div>
        </div>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <div className="bg-emerald-500 transition-all" style={{ width: `${(g / total) * 100}%` }} />
        <div className="bg-amber-400 transition-all"   style={{ width: `${(y / total) * 100}%` }} />
        <div className="bg-red-500 transition-all"     style={{ width: `${(r / total) * 100}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{((g / total) * 100).toFixed(0)}% Saudável</span>
        <span>{((r / total) * 100).toFixed(0)}% Crítico</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioHealthPage() {
  const [rows,    setRows]    = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all" | "green" | "yellow" | "red">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, metRes, risksRes, issuesRes] = await Promise.all([
        fetch("/api/ppm/projects"),
        fetch("/api/ppm/metrics"),
        fetch("/api/ppm/risks"),
        fetch("/api/ppm/issues"),
      ]);
      const [projJson, metJson, risksJson, issuesJson] = await Promise.all([
        projRes.json(), metRes.json(), risksRes.json(), issuesRes.json(),
      ]);

      if (!projJson.success) return;

      const profitMap = new Map<string, { cpi: number | null; spi: number | null; eac: number | null }>(
        (metJson.success ? metJson.data.profitability : []).map((p: { project_id: string; cpi: number | null; spi: number | null; eac: number | null }) => [
          p.project_id,
          { cpi: p.cpi, spi: p.spi, eac: p.eac },
        ])
      );

      // Count open risks/issues per project
      const riskCounts = new Map<string, number>();
      if (risksJson.success) {
        for (const r of risksJson.data as { project_id: string; status: string }[]) {
          if (r.status !== "closed") {
            riskCounts.set(r.project_id, (riskCounts.get(r.project_id) ?? 0) + 1);
          }
        }
      }
      const issueCounts = new Map<string, number>();
      if (issuesJson.success) {
        for (const i of issuesJson.data as { project_id: string; status: string }[]) {
          if (i.status !== "closed" && i.status !== "resolved") {
            issueCounts.set(i.project_id, (issueCounts.get(i.project_id) ?? 0) + 1);
          }
        }
      }

      const built: HealthRow[] = (projJson.data.projects as PpmProject[])
        .filter(p => p.status === "active")
        .map(p => {
          const evm = profitMap.get(p.project_id);
          const cpi = evm?.cpi ?? null;
          const spi = evm?.spi ?? null;
          const eac = evm?.eac ?? null;
          const bh  = calcBudgetHealth(p.budget_cost, p.actual_cost);
          const daysLate = daysOverdue(p.planned_end_date);
          const openRisks  = riskCounts.get(p.project_id)  ?? 0;
          const openIssues = issueCounts.get(p.project_id) ?? 0;
          const overallHealth = deriveHealth(cpi, spi, daysLate, bh.variancePct);
          return {
            project: p,
            cpi,
            spi,
            eac,
            daysLate,
            openRisks,
            openIssues,
            budgetVariancePct: bh.variancePct,
            overallHealth,
          };
        });

      // Sort: red first, then yellow, then green
      built.sort((a, b) => {
        const order = { red: 0, yellow: 1, green: 2 };
        return order[a.overallHealth] - order[b.overallHealth];
      });

      setRows(built);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = filter === "all" ? rows : rows.filter(r => r.overallHealth === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Portfolio Health</h1>
              <p className="text-xs text-gray-500">CPI · SPI · Budget variance · Risk exposure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            {(["all","green","yellow","red"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === f
                    ? f === "all"    ? "bg-gray-800 text-white border-gray-800"
                    : f === "green"  ? "bg-emerald-600 text-white border-emerald-600"
                    : f === "yellow" ? "bg-amber-500 text-white border-amber-500"
                    :                  "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "Todos" : f === "green" ? "🟢 Saudável" : f === "yellow" ? "🟡 Risco" : "🔴 Crítico"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Summary */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <SummaryBanner rows={rows} />
            </div>
            <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Legenda EVM</h3>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div><span className="font-semibold text-gray-800">CPI</span> — Cost Performance Index. &gt;1.0 = abaixo do orçamento.</div>
                <div><span className="font-semibold text-gray-800">SPI</span> — Schedule Performance Index. &gt;1.0 = adiantado.</div>
                <div><span className="font-semibold text-gray-800">EAC</span> — Estimate at Completion. Previsão de custo final.</div>
                <div><span className="font-semibold text-gray-800">Margem</span> — (Revenue − Cost) / Revenue × 100.</div>
                <div><span className="font-semibold text-emerald-600">● Saudável</span> — CPI/SPI ≥ 0.95, sem atraso, orçamento OK.</div>
                <div><span className="font-semibold text-amber-600">● Em Risco</span> — CPI/SPI entre 0.85–0.95 ou leve atraso.</div>
                <div><span className="font-semibold text-red-600">● Crítico</span> — CPI/SPI &lt; 0.85, &gt;14d atraso ou &gt;15% over budget.</div>
              </div>
            </div>
          </div>
        )}

        {/* Project Cards */}
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-400">Carregando health report…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            {filter === "all" ? "Nenhum projeto ativo encontrado." : `Nenhum projeto com status "${filter}".`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map(row => <HealthCard key={row.project.project_id} row={row} />)}
          </div>
        )}
      </div>
    </div>
  );
}

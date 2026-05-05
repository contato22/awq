"use client";

// ─── /awq/ppm/profitability — Project Profitability & EVM ────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, DollarSign, Download } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { ppmFetch } from "@/lib/ppm-fetch";

interface ProfitRow {
  project_id: string; project_code: string; project_name: string; bu_code: string; status: string;
  budget_revenue: number; actual_revenue: number;
  budget_cost: number;   actual_cost: number;
  budget_margin: number; actual_margin: number;
  budget_margin_pct: number; actual_margin_pct: number;
  planned_value: number; earned_value: number; actual_cost_evm: number;
  cpi: number | null; spi: number | null; etc: number | null; eac: number | null;
}

interface Metrics {
  total_projects: number; active_projects: number;
  total_budget_revenue: number; total_actual_revenue: number;
  total_budget_cost: number; total_actual_cost: number; avg_margin_pct: number;
}

function fmtPct(n: number | null) { if (n == null) return "—"; return n.toFixed(1) + "%"; }
function fmtInd(n: number | null) {
  if (n == null) return <span className="text-gray-400">—</span>;
  const ok = n >= 1;
  return <span className={ok ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{n.toFixed(2)}</span>;
}

const BU_CHIP: Record<string, string> = {
  JACQES: "bg-brand-100 text-brand-700", CAZA: "bg-violet-100 text-violet-700",
  ADVISOR: "bg-emerald-100 text-emerald-700", VENTURE: "bg-amber-100 text-amber-700",
};

export default function ProfitabilityPage() {
  const [rows,    setRows]    = useState<ProfitRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [sort,    setSort]    = useState<keyof ProfitRow>("budget_margin_pct");
  const [asc,     setAsc]     = useState(false);

  function exportCSV() {
    const headers = ["Projeto","Código","BU","Status","Rev.Budget","Rev.Real","Custo Budget","Custo Real","Margem%Budget","Margem%Real","CPI","SPI","EAC"];
    const csvRows = [
      headers.join(";"),
      ...sorted.map(r => [
        `"${r.project_name}"`,
        r.project_code,
        r.bu_code,
        r.status,
        r.budget_revenue.toFixed(2),
        r.actual_revenue.toFixed(2),
        r.budget_cost.toFixed(2),
        r.actual_cost.toFixed(2),
        r.budget_margin_pct.toFixed(1),
        r.actual_margin_pct.toFixed(1),
        r.cpi?.toFixed(2) ?? "",
        r.spi?.toFixed(2) ?? "",
        r.eac?.toFixed(2) ?? "",
      ].join(";"))
    ];
    const blob = new Blob(["﻿" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `rentabilidade-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await ppmFetch("/api/ppm/metrics") as { success: boolean; data: { profitability: ProfitRow[]; metrics: Metrics } };
      if (json.success) {
        setRows(json.data.profitability);
        setMetrics(json.data.metrics);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleSort(col: keyof ProfitRow) {
    if (sort === col) setAsc(a => !a);
    else { setSort(col); setAsc(false); }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sort] as number ?? -Infinity;
    const bv = b[sort] as number ?? -Infinity;
    return asc ? av - bv : bv - av;
  });

  const totalBudgetMargin  = rows.reduce((s, r) => s + r.budget_margin,  0);
  const totalActualMargin  = rows.reduce((s, r) => s + r.actual_margin,  0);
  const totalBudgetRevenue = metrics?.total_budget_revenue ?? 0;
  const totalActualRevenue = metrics?.total_actual_revenue ?? 0;

  const SortHeader = ({ col, label }: { col: keyof ProfitRow; label: string }) => (
    <th
      className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700 whitespace-nowrap select-none"
      onClick={() => toggleSort(col)}
    >
      {label}{sort === col ? (asc ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/ppm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Rentabilidade de Projetos</h1>
              <p className="text-xs text-gray-500">Budget vs Actual · EVM (CPI / SPI)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} title="Exportar CSV"
              className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <Download size={13} /> CSV
            </button>
            <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            Erro ao carregar rentabilidade: {error}
          </div>
        )}

        {/* Portfolio KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Revenue Budget",  value: formatBRL(totalBudgetRevenue), color: "text-gray-900" },
            { label: "Revenue Realiz.", value: formatBRL(totalActualRevenue),  color: "text-brand-600" },
            { label: "Margem Budget",   value: formatBRL(totalBudgetMargin),   color: totalBudgetMargin  > 0 ? "text-emerald-600" : "text-red-600" },
            { label: "Margem Realiz.",  value: formatBRL(totalActualMargin),   color: totalActualMargin  > 0 ? "text-emerald-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* EVM Legend */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-xs text-gray-600 space-y-1">
          <div className="font-semibold text-brand-700 mb-1">📊 Guia de Métricas EVM</div>
          <div><strong>CPI</strong> (Cost Performance Index) = EV / AC — {">"} 1 = abaixo do orçamento · {"<"} 1 = acima do orçamento</div>
          <div><strong>SPI</strong> (Schedule Performance Index) = EV / PV — {">"} 1 = adiantado · {"<"} 1 = atrasado</div>
          <div><strong>EAC</strong> (Estimate at Completion) = AC + (PV - EV) / CPI — custo final estimado</div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Projeto</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">BU</th>
                  <SortHeader col="budget_revenue"   label="Rev. Budget"   />
                  <SortHeader col="actual_revenue"   label="Rev. Realiz."  />
                  <SortHeader col="budget_margin_pct" label="Margem %"     />
                  <SortHeader col="actual_margin_pct" label="Margem Real %" />
                  <SortHeader col="cpi"               label="CPI"          />
                  <SortHeader col="spi"               label="SPI"          />
                  <SortHeader col="eac"               label="EAC"          />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Carregando…</td></tr>
                ) : sorted.map(row => {
                  const marginOk = row.actual_margin_pct >= row.budget_margin_pct - 5;
                  return (
                    <tr key={row.project_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/awq/ppm/${row.project_id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-600 block">
                          {row.project_name}
                        </Link>
                        <div className="text-[10px] text-gray-400">{row.project_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BU_CHIP[row.bu_code] ?? "bg-gray-100 text-gray-600"}`}>{row.bu_code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatBRL(row.budget_revenue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.actual_revenue > 0 ? formatBRL(row.actual_revenue) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{fmtPct(row.budget_margin_pct)}</td>
                      <td className="px-4 py-3">
                        {row.actual_revenue > 0 ? (
                          <div className="flex items-center gap-1">
                            {marginOk ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-500" />}
                            <span className={`text-sm font-bold ${marginOk ? "text-emerald-600" : "text-red-600"}`}>{fmtPct(row.actual_margin_pct)}</span>
                          </div>
                        ) : <span className="text-gray-300 text-xs">sem receita</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">{fmtInd(row.cpi)}</td>
                      <td className="px-4 py-3 text-sm">{fmtInd(row.spi)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.eac != null ? formatBRL(row.eac) : <span className="text-gray-300">—</span>}</td>
                    </tr>
                  );
                })}
                {!loading && sorted.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum projeto encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

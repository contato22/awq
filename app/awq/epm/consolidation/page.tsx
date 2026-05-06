// ─── /awq/epm/consolidation — Consolidação Multi-Entidade ────────────────────
//
// Shows the AWQ Holding consolidation:
//   4 BUs → consolidated holding P&L
//   Intercompany eliminations
//   Management vs Statutory toggle (snapshot)
//
// DATA: buildDreQuery() per entity + consolidated, plus awq-derived-metrics snapshot

import Header from "@/components/Header";
import Link from "next/link";
import {
  Building2, GitMerge, BarChart3, AlertTriangle, TrendingUp, DollarSign,
} from "lucide-react";
import { buildFinancialQuery, fmtBRL, ENTITY_LABELS } from "@/lib/financial-query";
import { buildDreQuery } from "@/lib/dre-query";
import { buData, consolidated, consolidatedMargins } from "@/lib/awq-derived-metrics";

function fmtR(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BU_COLORS: Record<string, string> = {
  jacqes:  "bg-brand-500",
  caza:    "bg-emerald-500",
  venture: "bg-amber-500",
  advisor: "bg-violet-500",
  awq:     "bg-gray-500",
};

export default async function ConsolidationPage() {
  const [q, dreAll] = await Promise.all([
    buildFinancialQuery(),
    buildDreQuery("all"),
  ]);

  const opEntities = q.entities.filter((e) =>
    ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity)
  );

  const snap = consolidated;

  return (
    <>
      <Header
        title="Consolidação Multi-Entidade"
        subtitle={`EPM · AWQ Group · Holding → 4 BUs · ${q.hasData ? "Base bancária real" : "Snapshot planejamento"}`}
      />
      <div className="page-container">

        {/* ── Methodology notice ──────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800">
          <GitMerge size={14} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Consolidação gerencial AWQ:</span>{" "}
            Visão de caixa por entidade + eliminação de transferências intercompany.
            Para consolidação estatutária completa, consulte o BPO contábil.
            Intercompany eliminado: <strong>{fmtBRL(q.consolidated.intercompanyEliminated)}</strong>.
          </div>
        </div>

        {/* ── Consolidated P&L summary ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Receita Consolidada",  value: dreAll.hasData ? dreAll.dreRevenue : snap.revenue,    color: "text-emerald-700" },
            { label: "Margem Bruta",         value: dreAll.hasData
                ? (dreAll.dreRevenue > 0 ? `${(dreAll.dreGrossProfit / dreAll.dreRevenue * 100).toFixed(1)}%` : "—")
                : `${(consolidatedMargins.grossMargin * 100).toFixed(1)}%`,
              color: "text-brand-700", isStr: true },
            { label: "EBITDA Consolidado",   value: dreAll.hasData ? dreAll.dreEBITDA : snap.ebitda,      color: dreAll.hasData ? (dreAll.dreEBITDA >= 0 ? "text-emerald-700" : "text-red-700") : "text-emerald-700" },
            { label: "Intercompany Elim.",   value: q.consolidated.intercompanyEliminated,                color: "text-violet-700" },
          ].map((card) => (
            <div key={card.label} className="card p-4">
              <div className={`text-xl font-bold tabular-nums ${card.color}`}>
                {(card as { isStr?: boolean }).isStr ? String(card.value) : fmtR(Number(card.value))}
              </div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── Per-entity cash breakdown (real data) ───────────────── */}
        {q.hasData && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-900">
                Visão de Caixa por Entidade — Base Bancária
              </span>
            </div>
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="py-2.5 px-3 text-gray-500 font-semibold">Entidade</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Entradas</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Saídas</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Fluxo Líq.</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Saldo</th>
                    <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Mix %</th>
                  </tr>
                </thead>
                <tbody>
                  {q.entities
                    .filter((e) => !["Intercompany","Unknown"].includes(e.entity))
                    .map((e) => {
                      const mix = q.consolidated.totalRevenue > 0
                        ? (e.operationalRevenue / q.consolidated.totalRevenue) * 100
                        : 0;
                      return (
                        <tr key={e.entity} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${BU_COLORS[e.entity.toLowerCase()] ?? "bg-gray-400"}`} />
                              <span className="font-medium text-gray-800">
                                {ENTITY_LABELS[e.entity] ?? e.entity}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 font-semibold">
                            {fmtBRL(e.operationalRevenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-red-600">
                            ({fmtBRL(e.operationalExpenses)})
                          </td>
                          <td className={`py-2.5 px-3 text-right tabular-nums font-bold ${
                            e.operationalNetCash >= 0 ? "text-gray-900" : "text-red-700"
                          }`}>
                            {fmtBRL(e.operationalNetCash)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">
                            {fmtBRL(e.totalCashBalance)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-400 rounded-full" style={{ width: `${mix}%` }} />
                              </div>
                              <span className="text-gray-500 tabular-nums">{mix.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {/* Consolidated total */}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="py-2.5 px-3 text-gray-900">AWQ Consolidado</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">
                      {fmtBRL(q.consolidated.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-red-700">
                      ({fmtBRL(q.consolidated.totalExpenses)})
                    </td>
                    <td className={`py-2.5 px-3 text-right tabular-nums ${
                      q.consolidated.operationalNetCash >= 0 ? "text-gray-900" : "text-red-700"
                    }`}>
                      {fmtBRL(q.consolidated.operationalNetCash)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">
                      {fmtBRL(q.consolidated.totalCashBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-400">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Planning snapshot (Management view) ─────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">
              Visão de Gestão por BU — Snapshot Accrual 2026
            </span>
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
              Snapshot
            </span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Receita</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">EBITDA</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">EBITDA%</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">ROIC</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Capital Alocado</th>
                </tr>
              </thead>
              <tbody>
                {buData.map((bu) => {
                  const buEbitdaMargin = bu.revenue > 0 ? (bu.ebitda / bu.revenue) * 100 : 0;
                  return (
                  <tr key={bu.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                        <span className="font-medium text-gray-800">{bu.name}</span>
                        <span className="text-[10px] text-gray-400">
                          {bu.economicType === "pre_revenue" ? "Pré-receita" :
                           bu.economicType === "hybrid_investment" ? "Investimento" : ""}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-600">
                      {fmtR(bu.revenue)}
                    </td>
                    <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${bu.ebitda >= 0 ? "text-gray-800" : "text-red-600"}`}>
                      {fmtR(bu.ebitda)}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${buEbitdaMargin >= 15 ? "text-emerald-600" : buEbitdaMargin >= 0 ? "text-amber-600" : "text-red-600"}`}>
                      {bu.economicType === "pre_revenue" ? "—" : `${buEbitdaMargin.toFixed(0)}%`}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${bu.roic >= 20 ? "text-emerald-600" : bu.roic > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      {bu.roic > 0 ? `${bu.roic.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">
                      {fmtR(bu.capitalAllocated)}
                    </td>
                  </tr>
                );
                })}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2.5 px-3 text-gray-900">AWQ Consolidado</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">{fmtR(snap.revenue)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{fmtR(snap.ebitda)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{(consolidatedMargins.ebitdaMargin * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">—</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">
                    {fmtR(buData.reduce((s, b) => s + b.capitalAllocated, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Intercompany note ────────────────────────────────────── */}
        {q.hasData && q.consolidated.intercompanyEliminated > 0 && (
          <div className="card p-4 border-l-4 border-violet-300">
            <div className="flex items-center gap-2 mb-1">
              <GitMerge size={13} className="text-violet-600" />
              <span className="text-xs font-semibold text-violet-800">Eliminação Intercompany</span>
            </div>
            <p className="text-xs text-violet-700">
              {fmtBRL(q.consolidated.intercompanyEliminated)} de transferências intercompany foram identificadas
              e eliminadas do consolidado. Isso evita dupla contagem de receita/despesa entre as entidades.
              Contas intercompany: 9.1.xx (AR) e 9.2.xx (AP).
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/pl" className="text-brand-600 hover:underline">P&L →</Link>
          <Link href="/awq/epm/kpis" className="text-brand-600 hover:underline">KPIs →</Link>
        </div>

      </div>
    </>
  );
}

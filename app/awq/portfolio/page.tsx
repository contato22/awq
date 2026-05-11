"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { SEED_PORTCOS, computePortfolioTotals } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
import {
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  Layers,
  Tv2,
  Loader2,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtR(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(1) + "%";
}

function multColor(mult: number | null | undefined) {
  if (mult == null) return "text-gray-400";
  if (mult >= 1.5)  return "text-emerald-400";
  if (mult >= 1.0)  return "text-amber-400";
  return "text-red-400";
}

function runwayColor(months: number | null | undefined) {
  if (months == null) return "text-gray-400";
  if (months < 6) return "text-red-400";
  if (months < 12) return "text-amber-400";
  return "text-emerald-400";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioDashboardPage() {
  const [rows,    setRows]    = useState<any[]>([]);
  const [totals,  setTotals]  = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<"all" | "active" | "exited">("all");

  useEffect(() => {
    if (IS_STATIC) {
      setRows(SEED_PORTCOS);
      setTotals(computePortfolioTotals(SEED_PORTCOS));
      setLoading(false);
      return;
    }
    fetch("/api/ma/portfolio")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setRows(json.data ?? []);
          setTotals(json.totals ?? null);
        } else {
          setError(json.error ?? "Erro ao carregar portfólio");
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const visibleRows = rows.filter((r) => {
    if (filter === "all")    return true;
    if (filter === "active") return r.status === "active";
    if (filter === "exited") return r.status === "exited";
    return true;
  });

  const summaryCards = [
    {
      label: "Empresas no Portfólio",
      value: totals?.total_portcos ?? rows.length,
      icon:  Building2,
      color: "text-blue-400",
      bg:    "bg-blue-500/10",
    },
    {
      label: "Total Investido",
      value: fmtR(totals?.total_investment),
      icon:  DollarSign,
      color: "text-emerald-400",
      bg:    "bg-emerald-500/10",
    },
    {
      label: "Valor Atual",
      value: fmtR(totals?.total_current_value),
      icon:  TrendingUp,
      color: "text-amber-400",
      bg:    "bg-amber-500/10",
    },
    {
      label: "Ganho Não-Realizado",
      value: fmtR(totals?.total_unrealized_gain),
      icon:  ArrowUpRight,
      color: (totals?.total_unrealized_gain ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
      bg:    (totals?.total_unrealized_gain ?? 0) >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Múltiplo Médio",
      value: totals?.weighted_avg_multiple != null
        ? totals.weighted_avg_multiple.toFixed(2) + "×"
        : "—",
      icon:  BarChart3,
      color: "text-violet-400",
      bg:    "bg-violet-500/10",
    },
    {
      label: "Mídia Entregue %",
      value: totals?.media_delivery_pct != null
        ? fmtPct(totals.media_delivery_pct)
        : "—",
      icon:  Tv2,
      color: "text-cyan-400",
      bg:    "bg-cyan-500/10",
    },
  ];

  return (
    <>
      <Header
        title="Portfolio Companies"
        subtitle="AWQ Group Investment Portfolio"
      />
      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* ── Summary Strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl bg-white border border-gray-200 p-4 flex items-center gap-3"
              >
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-gray-900 leading-none truncate">{card.value}</div>
                  <div className="text-[10px] text-gray-500 mt-1 leading-tight">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">

          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-100">
            <Layers size={13} className="text-gray-400 mr-1" />
            {(["all","active","exited"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === tab
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "all" ? "Todas" : tab === "active" ? "Ativas" : "Exitadas"}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">{visibleRows.length} empresa{visibleRows.length !== 1 ? "s" : ""}</span>
          </div>

          {loading && (
            <div className="flex items-center gap-2 justify-center py-12 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Carregando portfólio...
            </div>
          )}

          {error && (
            <div className="m-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500">
                    <th className="text-left  py-3 px-4 font-semibold">Empresa</th>
                    <th className="text-right py-3 px-4 font-semibold">% AWQ</th>
                    <th className="text-right py-3 px-4 font-semibold">Val. Entrada</th>
                    <th className="text-right py-3 px-4 font-semibold">Val. Atual</th>
                    <th className="text-right py-3 px-4 font-semibold">Múltiplo</th>
                    <th className="text-right py-3 px-4 font-semibold">MRR</th>
                    <th className="text-right py-3 px-4 font-semibold">Runway</th>
                    <th className="text-right py-3 px-4 font-semibold">Mídia %</th>
                    <th className="text-left  py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400">
                        Nenhuma empresa encontrada.{" "}
                        <Link href="/awq/ma/deals" className="text-blue-500 underline">
                          Ver pipeline de deals
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const multiple =
                        row.entry_valuation && row.entry_valuation > 0
                          ? (row.current_valuation ?? row.entry_valuation) / row.entry_valuation
                          : null;

                      const mediaPct =
                        row.media_commitment_value && row.media_commitment_value > 0
                          ? ((row.media_delivered_value ?? 0) / row.media_commitment_value) * 100
                          : null;

                      const runway = row.runway_months ?? null;

                      return (
                        <tr key={row.portco_id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{row.company_name ?? row.legal_name ?? "—"}</div>
                            {row.portco_code && (
                              <div className="text-[10px] text-gray-400">{row.portco_code}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600 font-medium">
                            {fmtPct(row.awq_ownership_pct)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-500">
                            {fmtR(row.entry_valuation)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-900 font-bold">
                            {fmtR(row.current_valuation ?? row.entry_valuation)}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${multColor(multiple)}`}>
                            {multiple != null ? multiple.toFixed(2) + "×" : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600 font-medium">
                            {fmtR(row.latest_mrr)}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${runwayColor(runway)}`}>
                            {runway != null ? runway + " m" : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {mediaPct != null ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-500 rounded-full"
                                    style={{ width: `${Math.min(mediaPct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-cyan-600 text-[10px] font-bold">
                                  {fmtPct(mediaPct)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/awq/portfolio/${row.portco_id}`}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              Detalhes <ChevronRight size={10} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}

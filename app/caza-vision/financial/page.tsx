"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  CloudOff,
  Minus,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthRow {
  month:       string;
  receita:     number;
  alimentacao: number;
  gasolina:    number;
  expenses:    number;
  profit:      number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function variance(actual: number, budget: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

function varIcon(v: number) {
  if (v > 0.5) return <ArrowUpRight size={10} className="text-emerald-600" />;
  if (v < -0.5) return <ArrowDownRight size={10} className="text-red-600" />;
  return <Minus size={10} className="text-gray-500" />;
}

function varColor(v: number) {
  if (v > 0.5) return "text-emerald-600";
  if (v < -0.5) return "text-red-600";
  return "text-gray-500";
}

// ─── Data source abstraction ──────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaFinancialPage() {
  const [rows, setRows]     = useState<MonthRow[]>([]);
  const [source, setSource] = useState<"internal" | "static" | "empty" | "loading">("loading");

  useEffect(() => {
    // Always try the internal Neon DB first; fall back to static JSON if empty or unavailable.
    // This ensures live data is shown even when NEXT_PUBLIC_STATIC_DATA was baked as "1".
    async function load() {
      try {
        const res = await fetch("/api/caza/financial");
        if (res.ok) {
          const data = await res.json() as MonthRow[];
          if (Array.isArray(data) && data.length > 0) {
            setRows(data); setSource("internal"); return;
          }
        }
      } catch { /* API unavailable (e.g. GitHub Pages) — fall through */ }

      // Fallback: static snapshot
      try {
        const res = await fetch(`${BASE_PATH}/data/caza-financial.json`);
        if (res.ok) {
          const data = await res.json() as MonthRow[];
          setRows(Array.isArray(data) ? data : []);
          setSource(Array.isArray(data) && data.length > 0 ? "static" : "empty");
          return;
        }
      } catch { /* ignore */ }
      setRows([]); setSource("empty");
    }
    load();
  }, []);

  // ── Summaries ─────────────────────────────────────────────────────────────
  const currentYear  = new Date().getFullYear().toString().slice(2);
  const ytdRows      = rows.filter((r) => r.month.includes(`/${currentYear}`));
  const summary      = ytdRows.length > 0 ? ytdRows : rows;

  const totalReceita  = summary.reduce((s, r) => s + r.receita,  0);
  const totalDespesas = summary.reduce((s, r) => s + r.expenses, 0);
  const totalLucro    = summary.reduce((s, r) => s + r.profit,   0);
  const margem        = totalReceita > 0 ? ((totalLucro / totalReceita) * 100).toFixed(1) : "0.0";

  const lastRow   = rows[rows.length - 1];
  const prevRow   = rows[rows.length - 2];
  const lastDelta = lastRow && prevRow && prevRow.receita > 0
    ? (((lastRow.receita - prevRow.receita) / prevRow.receita) * 100).toFixed(1)
    : "0.0";

  const prevYear     = String(Number(currentYear) - 1).padStart(2, "0");
  const prevYtdRows  = rows.filter((r) => r.month.includes(`/${prevYear}`)).slice(0, ytdRows.length || summary.length);
  const prevReceita  = prevYtdRows.reduce((s, r) => s + r.receita, 0);
  const prevLucro    = prevYtdRows.reduce((s, r) => s + r.profit,  0);
  const receitaDelta = prevReceita > 0 ? (((totalReceita - prevReceita) / prevReceita) * 100).toFixed(1) : null;
  const lucroDelta   = prevLucro   > 0 ? (((totalLucro   - prevLucro)   / prevLucro)   * 100).toFixed(1) : null;

  const summaryCards = [
    {
      label: `Receita YTD 20${currentYear}`,
      value: fmtR(totalReceita),
      sub:   `${summary.length} meses`,
      icon:  DollarSign,
      color: "text-emerald-600",
      bg:    "bg-emerald-50",
      delta: receitaDelta ? `${parseFloat(receitaDelta) >= 0 ? "+" : ""}${receitaDelta}%` : "",
      up:    receitaDelta ? parseFloat(receitaDelta) >= 0 : true,
    },
    {
      label: "Despesas YTD",
      value: fmtR(totalDespesas),
      sub:   "Alim. + Gasolina",
      icon:  BarChart3,
      color: "text-red-600",
      bg:    "bg-red-50",
      delta: "",
      up:    false,
    },
    {
      label: "Lucro Líquido YTD",
      value: fmtR(totalLucro),
      sub:   `Margem ${margem}%`,
      icon:  TrendingUp,
      color: "text-brand-600",
      bg:    "bg-brand-50",
      delta: lucroDelta ? `${parseFloat(lucroDelta) >= 0 ? "+" : ""}${lucroDelta}%` : "",
      up:    lucroDelta ? parseFloat(lucroDelta) >= 0 : true,
    },
    {
      label: lastRow ? `Receita — ${lastRow.month}` : "Último Mês",
      value: lastRow ? fmtR(lastRow.receita) : "—",
      sub:   lastRow ? `Lucro: ${fmtR(lastRow.profit)}` : "",
      icon:  DollarSign,
      color: "text-violet-700",
      bg:    "bg-violet-50",
      delta: `${parseFloat(lastDelta) >= 0 ? "+" : ""}${lastDelta}%`,
      up:    parseFloat(lastDelta) >= 0,
    },
  ];

  return (
    <>
      <Header
        title="Financial — Caza Vision"
        subtitle="Receita, despesas e lucro por projeto · agrupado por mês"
      />
      <div className="page-container">

        {/* Source badge */}
        <div className="flex items-center gap-2">
          {source === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500">
              <Database size={11} /> Carregando…
            </span>
          )}
          {source === "internal" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
              <Database size={11} /> Base interna AWQ
            </span>
          )}
          {source === "static" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600">
              <Database size={11} /> Snapshot estático
            </span>
          )}
          {source === "empty" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <CloudOff size={11} /> Sem dados — importe do Notion ou crie projetos internamente
            </span>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.delta && (
                      card.up
                        ? <ArrowUpRight size={11} className="text-emerald-600" />
                        : <ArrowDownRight size={11} className="text-red-600" />
                    )}
                    {card.delta && (
                      <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>
                        {card.delta}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Table */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Receita por Mês — agrupado por COMPETÊNCIA
          </h2>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
              <AlertCircle size={16} /> Carregando…
            </div>
          ) : rows.length === 0 ? (
            <EmptyState compact title="Sem dados financeiros" description="Importe projetos do Notion via /caza-vision/import ou crie registros internamente." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita (Orç.)</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Alimentação</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Gasolina</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Total Despesas</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const margin = row.receita > 0
                      ? ((row.profit / row.receita) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-gray-700 font-medium text-xs">{row.month}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900 font-semibold text-xs">{fmtR(row.receita)}</td>
                        <td className="py-2.5 px-3 text-right text-red-600 text-xs">
                          {row.alimentacao > 0 ? fmtR(row.alimentacao) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-red-600 text-xs">
                          {row.gasolina > 0 ? fmtR(row.gasolina) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-semibold text-xs">{fmtR(row.expenses)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold text-xs">{fmtR(row.profit)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="badge badge-green text-[10px]">{margin}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                    <td className="py-2.5 px-3 text-right text-gray-900 font-bold text-xs">{fmtR(rows.reduce((s, r) => s + r.receita, 0))}</td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">{fmtR(rows.reduce((s, r) => s + r.alimentacao, 0))}</td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">{fmtR(rows.reduce((s, r) => s + r.gasolina, 0))}</td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">{fmtR(rows.reduce((s, r) => s + r.expenses, 0))}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold text-xs">{fmtR(rows.reduce((s, r) => s + r.profit, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
